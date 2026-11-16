const AI_EMERGENCY_TIMEOUT_MS = 45000;

export class AIEmergencyServiceError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "AIEmergencyServiceError";
    this.code = code;
  }
}

export async function understandEmergency(message) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_EMERGENCY_TIMEOUT_MS);

  try {
    const response = await fetch("/api/ai/understand-emergency", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({ message }),
    });

    let payload = null;

    try {
      payload = await response.json();
    } catch {
      throw new AIEmergencyServiceError(
        "INVALID_RESPONSE",
        "AI assistance returned an invalid response.",
      );
    }

    if (!response.ok || !payload?.ok) {
      throw new AIEmergencyServiceError(
        payload?.error ?? "AI_UNAVAILABLE",
        "AI assistance is temporarily unavailable.",
      );
    }

    return payload.data;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new AIEmergencyServiceError(
        "AI_TIMEOUT",
        "AI assistance took too long.",
      );
    }

    if (error instanceof AIEmergencyServiceError) {
      throw error;
    }

    throw new AIEmergencyServiceError(
      "AI_UNAVAILABLE",
      "AI assistance is temporarily unavailable.",
    );
  } finally {
    clearTimeout(timeout);
  }
}
