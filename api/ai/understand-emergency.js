import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

const XAI_MODEL = "grok-4.20-0309-non-reasoning";
const XAI_BASE_URL = "https://api.x.ai/v1";
const MAX_MESSAGE_LENGTH = 1800;
const XAI_REQUEST_TIMEOUT_MS = 30000;

const incidentTypeSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim().toUpperCase() : value),
  z.enum([
    "FLOODING",
    "CYCLONE",
    "MEDICAL",
    "TRAPPED",
    "FIRE",
    "LANDSLIDE",
    "OTHER",
  ]),
);

const nullableIntegerSchema = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) {
    return Number(value.trim());
  }

  return value;
}, z.number().int().nonnegative().nullable());

const aiRawExtractionSchema = z.object({
  incidentType: incidentTypeSchema.catch("OTHER"),
  peopleCount: nullableIntegerSchema.catch(null),
  adults: nullableIntegerSchema.catch(null),
  children: nullableIntegerSchema.catch(null),
  elderly: nullableIntegerSchema.catch(null),
  mobilityAssistance: z.boolean().catch(false),
  summary: z.string().trim().min(1).max(280).catch(
    "Emergency details need manual review.",
  ),
  needsReview: z.boolean().catch(false),
});

const grokExtractionSchema = z
  .object({
    incidentType: z.enum([
      "FLOODING",
      "CYCLONE",
      "MEDICAL",
      "TRAPPED",
      "FIRE",
      "LANDSLIDE",
      "OTHER",
    ]),
    peopleCount: z.number().int().nonnegative().nullable(),
    adults: z.number().int().nonnegative().nullable(),
    children: z.number().int().nonnegative().nullable(),
    elderly: z.number().int().nonnegative().nullable(),
    mobilityAssistance: z.boolean(),
    summary: z.string().trim().min(1).max(280),
    needsReview: z.boolean(),
  })
  .strict();

const normalizedExtractionSchema = z
  .object({
    incidentType: incidentTypeSchema,
    peopleCount: z.number().int().min(1).nullable(),
    adults: z.number().int().nonnegative().nullable(),
    children: z.number().int().nonnegative().nullable(),
    elderly: z.number().int().nonnegative().nullable(),
    mobilityAssistance: z.boolean(),
    summary: z.string().trim().min(1).max(280),
    needsReview: z.boolean(),
  })
  .superRefine((data, context) => {
    if (data.needsReview) {
      return;
    }

    if (
      data.peopleCount === null ||
      data.adults === null ||
      data.children === null ||
      data.elderly === null
    ) {
      context.addIssue({
        code: "custom",
        message: "Complete extractions require all family counts.",
      });
      return;
    }

    if (data.peopleCount !== data.adults + data.children + data.elderly) {
      context.addIssue({
        code: "custom",
        message: "peopleCount must equal adults + children + elderly.",
      });
    }
  });

function sendJson(response, statusCode, payload) {
  response.status(statusCode).json(payload);
}

function parseRequestBody(request) {
  if (request.body && typeof request.body === "object") {
    return Promise.resolve(request.body);
  }

  if (typeof request.body === "string") {
    try {
      return Promise.resolve(JSON.parse(request.body));
    } catch {
      return Promise.resolve(null);
    }
  }

  return new Promise((resolve) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
    });

    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve(null);
      }
    });

    request.on("error", () => {
      resolve(null);
    });
  });
}

function inferMissingCounts(rawData) {
  const inferred = { ...rawData };
  const countKeys = ["adults", "children", "elderly"];
  const knownCountTotal = countKeys.reduce(
    (total, key) => total + (inferred[key] ?? 0),
    0,
  );
  const missingKeys = countKeys.filter((key) => inferred[key] === null);

  if (inferred.peopleCount === null && knownCountTotal > 0 && missingKeys.length === 0) {
    inferred.peopleCount = knownCountTotal;
  }

  if (
    inferred.peopleCount !== null &&
    missingKeys.length === 1 &&
    knownCountTotal <= inferred.peopleCount
  ) {
    inferred[missingKeys[0]] = inferred.peopleCount - knownCountTotal;
  }

  return inferred;
}

function normalizeExtraction(rawData) {
  const inferred = inferMissingCounts(rawData);
  const countsComplete =
    inferred.peopleCount !== null &&
    inferred.adults !== null &&
    inferred.children !== null &&
    inferred.elderly !== null &&
    inferred.peopleCount === inferred.adults + inferred.children + inferred.elderly &&
    inferred.peopleCount > 0;

  const candidate = {
    ...inferred,
    needsReview: Boolean(inferred.needsReview || !countsComplete),
    summary: inferred.summary.slice(0, 280),
  };

  return normalizedExtractionSchema.parse(candidate);
}

function getErrorStatus(error) {
  const status = error?.status ?? error?.response?.status;
  const statusNumber = Number(status);
  return Number.isInteger(statusNumber) ? statusNumber : null;
}

function logSafeAIError(error) {
  console.error("AI emergency understanding failed:", {
    name: error?.name ?? null,
    message: error?.message ?? null,
    status: getErrorStatus(error),
    code: error?.code ?? null,
  });
}

function createXAIClient() {
  const apiKey = process.env.XAI_API_KEY;

  if (!apiKey) {
    throw new Error("XAI_API_KEY is not configured.");
  }

  return new OpenAI({
    apiKey,
    baseURL: XAI_BASE_URL,
    timeout: XAI_REQUEST_TIMEOUT_MS,
    maxRetries: 1,
  });
}

function getExtractionPrompt(message) {
  return (
    "Extract emergency details from this citizen message.\n" +
    "Supported incidentType values: FLOODING, CYCLONE, MEDICAL, TRAPPED, FIRE, LANDSLIDE, OTHER.\n" +
    "Set mobilityAssistance true only for clear mobility needs such as cannot walk, wheelchair, difficulty walking, bedridden, or needs mobility support.\n" +
    "Infer missing arithmetic only when safe. Example: total 5, 2 children, grandmother elderly = adults 2, children 2, elderly 1.\n" +
    "Use null for unknown counts. Set needsReview true when family counts are incomplete or uncertain.\n" +
    `Citizen message: ${message}`
  );
}

function extractParsedMessage(completion) {
  const message = completion?.choices?.[0]?.message;

  if (message?.parsed) {
    return message.parsed;
  }

  if (typeof message?.content === "string" && message.content.trim()) {
    return JSON.parse(message.content);
  }

  throw new Error("Provider returned an empty structured response.");
}

async function requestGrokExtraction(client, message) {
  const completion = await client.chat.completions.parse({
    model: XAI_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are an emergency information extraction assistant for Aashray AI. " +
          "Extract only facts stated by the citizen or safely derivable from explicit counts. " +
          "Do not choose shelters. Do not make evacuation decisions. " +
          "Do not give medical advice. Do not invent missing information. " +
          "If essential family information is missing, mark the result as needing review. " +
          "Return structured data matching the required schema.",
      },
      {
        role: "user",
        content: getExtractionPrompt(message),
      },
    ],
    max_completion_tokens: 512,
    response_format: zodResponseFormat(
      grokExtractionSchema,
      "aashray_emergency_extraction",
    ),
  });

  return extractParsedMessage(completion);
}

async function callXAI(message) {
  const client = createXAIClient();
  return requestGrokExtraction(client, message);
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, {
      ok: false,
      error: "METHOD_NOT_ALLOWED",
    });
    return;
  }

  const body = await parseRequestBody(request);
  const message = typeof body?.message === "string" ? body.message.trim() : "";

  if (!message || message.length > MAX_MESSAGE_LENGTH) {
    sendJson(response, 400, {
      ok: false,
      error: "INVALID_INPUT",
    });
    return;
  }

  try {
    const parsed = await callXAI(message);
    const rawData = aiRawExtractionSchema.parse(parsed);
    const data = normalizeExtraction(rawData);

    sendJson(response, 200, {
      ok: true,
      data,
    });
  } catch (error) {
    logSafeAIError(error);

    sendJson(response, 200, {
      ok: false,
      error: "AI_UNAVAILABLE",
    });
  }
}
