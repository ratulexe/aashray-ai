import cookie from "@fastify/cookie";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import { HopeError } from "@hope/shared";
import { ZodError, type z } from "zod";
import type { App } from "./context";
import { publicRoutes } from "./routes/public";
import { staffRoutes } from "./routes/staff";

export const STAFF_COOKIE = "hope_staff";
export const CITIZEN_COOKIE = "hope_citizen";

export function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  return schema.parse(data ?? {});
}

export function setSessionCookie(app: App, reply: FastifyReply, name: string, token: string, path: string, maxAgeSeconds: number) {
  reply.setCookie(name, token, {
    path,
    httpOnly: true,
    secure: app.config.cookieSecure,
    sameSite: "strict",
    maxAge: maxAgeSeconds,
  });
}

/**
 * Requests from a browser carry an Origin header. Staff routes only accept the
 * console's origin and public routes only the citizen app's, so neither app
 * can call the other's API (and cross-site requests are refused).
 */
function originGuard(allowed: string[]) {
  return async (request: FastifyRequest) => {
    const origin = request.headers.origin;
    if (origin && !allowed.includes(origin)) {
      throw new HopeError("FORBIDDEN_ORIGIN", "Requests from this site are not allowed", 403);
    }
  };
}

export async function buildServer(app: App, hooks: { waitForJobs: () => Promise<void> }): Promise<FastifyInstance> {
  const server = Fastify({
    logger: { level: process.env.LOG_LEVEL ?? "warn" },
    bodyLimit: 64 * 1024,
  });
  await server.register(cookie);

  server.setErrorHandler((error, _request, reply) => {
    if (error instanceof HopeError) {
      return reply.status(error.status).send({ error: { code: error.code, message: error.message, details: error.details } });
    }
    if (error instanceof ZodError) {
      const first = error.issues[0];
      return reply.status(400).send({ error: { code: "INVALID_INPUT", message: first ? `${first.path.join(".") || "input"}: ${first.message}` : "Invalid input", details: error.issues } });
    }
    const status = (error as { statusCode?: number }).statusCode;
    if (status && status < 500) return reply.status(status).send({ error: { code: "BAD_REQUEST", message: (error as Error).message } });
    server.log.error(error);
    return reply.status(500).send({ error: { code: "SERVER_ERROR", message: "Something went wrong" } });
  });

  server.addHook("onSend", async (_request, reply) => {
    reply.header("Cache-Control", "no-store");
    reply.header("X-Content-Type-Options", "nosniff");
  });

  server.get("/health", async () => ({ ok: true, mode: app.config.mode, now: app.clock.now() }));

  await server.register(async (scope) => {
    scope.addHook("onRequest", originGuard([app.config.citizenOrigin]));
    await publicRoutes(scope, app);
  }, { prefix: "/v1/public" });

  await server.register(async (scope) => {
    scope.addHook("onRequest", originGuard([app.config.consoleOrigin]));
    scope.addHook("onSend", async (_request, reply) => {
      reply.header("X-Robots-Tag", "noindex, nofollow");
    });
    await staffRoutes(scope, app, hooks);
  }, { prefix: "/v1/staff" });

  return server;
}
