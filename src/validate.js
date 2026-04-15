/* =============================================================================
   validate.js: Payload validation for PUT /session/:id requests.
   ============================================================================= */

export const VALID_STATES = new Set(["running", "paused", "dead", "unlit"]);
export const MAX_TORCHES = 8;
export const MAX_DURATION_MS = 24 * 60 * 60 * 1000; // 24-hour ceiling
export const MAX_ROUNDS = 99;

const VALID_TOP_KEYS = new Set(["v", "ts", "torches", "timerVisible"]);

const VALID_TORCH_KEYS = new Set([
  "id",
  "duration",
  "state",
  "deathAt",
  "remaining",
  "mode",
  "roundsTotal",
  "roundsRemaining",
]);

/**
 * Parses and validates a raw PUT request body.
 * Returns the parsed object if valid, null otherwise.
 * Only the exact expected shape is accepted; extra keys, wrong types, or
 * out-of-range values all return null.
 *
 * @param {string} body
 * @returns {{ v: number, ts: number, torches: object[] } | null}
 */
export function validatePayload(body) {
  let data;

  try {
    data = JSON.parse(body);
  } catch {
    return null;
  }

  if (
    (typeof data !== "object" || data === null || Array.isArray(data)) ||
    (typeof data.v !== "number" || !Number.isInteger(data.v) || data.v < 1) ||
    (typeof data.ts !== "number" || !Number.isInteger(data.ts) ||
      data.ts < 0) ||
    !Array.isArray(data.torches) ||
    (data.torches.length < 1 || data.torches.length > MAX_TORCHES) ||
    Object.keys(data).some((k) => !VALID_TOP_KEYS.has(k)) ||
    ("timerVisible" in data && typeof data.timerVisible !== "boolean")
  ) {
    return null;
  }

  for (const t of data.torches) {
    if (
      (typeof t !== "object" || t === null || Array.isArray(t)) ||
      Object.keys(t).some((k) => !VALID_TORCH_KEYS.has(k)) ||
      (!("duration" in t) || !("state" in t) || !("deathAt" in t)) ||
      !("remaining" in t) ||
      (
        "id" in t && t.id !== null &&
        (typeof t.id !== "string" || t.id.length < 1 || t.id.length > 64)
      ) ||
      (typeof t.duration !== "number" || !Number.isInteger(t.duration)) ||
      (t.duration < 1 || t.duration > MAX_DURATION_MS) ||
      (typeof t.state !== "string" || !VALID_STATES.has(t.state))
    ) {
      return null;
    }

    if ("mode" in t && t.mode !== "time" && t.mode !== "rounds") return null;

    const isRounds = t.mode === "rounds";

    if (isRounds) {
      if (
        (!("roundsTotal" in t) || !("roundsRemaining" in t)) ||
        (
          !Number.isInteger(t.roundsTotal) ||
          t.roundsTotal < 1 ||
          t.roundsTotal > MAX_ROUNDS
        ) ||
        (
          !Number.isInteger(t.roundsRemaining) ||
          t.roundsRemaining < 0 ||
          t.roundsRemaining > t.roundsTotal
        ) ||
        (t.deathAt !== null || t.remaining !== null) ||
        t.state === "paused" ||
        (t.state === "dead" && t.roundsRemaining !== 0) ||
        (t.state === "running" && t.roundsRemaining === 0)
      ) return null;
    } else { // Time Mode
      if ("roundsTotal" in t || "roundsRemaining" in t) return null;

      if (t.state === "running") {
        if (!Number.isInteger(t.deathAt) || t.deathAt <= 0) return null;
        if (t.remaining !== null) return null;
      } else if (t.state === "paused") {
        if (!Number.isInteger(t.remaining) || t.remaining < 0) return null;
        if (t.deathAt !== null) return null;
      } else {
        if (t.deathAt !== null || t.remaining !== null) return null;
      }
    }
  }

  return data;
}
