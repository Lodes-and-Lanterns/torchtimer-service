/* =============================================================================
   session.js: handleGet, handlePut, and handleDelete request handlers.
   ============================================================================= */

import { validatePayload } from "./validate.js";

export const MAX_BODY_BYTES = 4096;
export const SESSION_TTL = 86400; // 24 hours

const TOKEN_SUFFIX = ":t";

/**
 * Handles a DELETE /session/:id request.
 * Requires the correct bearer token. Removes both the state and token keys.
 *
 * @param {object} kv KV namespace (or mock)
 * @param {string} sessionId
 * @param {string | null} bearerToken
 * @returns {Promise<{ status: number, body: string }>}
 */
export async function handleDelete(kv, sessionId, bearerToken) {
  if (!bearerToken) return { status: 401, body: "Unauthorized" };

  const existingToken = await kv.get(sessionId + TOKEN_SUFFIX);

  if (existingToken === null) return { status: 404, body: "Not found" };
  if (existingToken !== bearerToken) return { status: 403, body: "Forbidden" };

  await kv.delete(sessionId + TOKEN_SUFFIX);
  await kv.delete(sessionId);

  return { status: 200, body: "OK" };
}

/**
 * Handles a GET /session/:id request.
 * Returns the stored session state or 404 if not found.
 *
 * @param {object} kv KV namespace (or mock)
 * @param {string} sessionId
 * @returns {Promise<{ status: number, body: string, json?: boolean }>}
 */
export async function handleGet(kv, sessionId) {
  const value = await kv.get(sessionId);
  if (!value) return { status: 404, body: "Session not found" };
  return { status: 200, body: value, json: true };
}

/**
 * Handles a PUT /session/:id request.
 * On the first PUT for a session, the bearer token is registered.
 * Subsequent PUTs must present the same token or they are rejected with 403.
 *
 * @param {object} kv KV namespace (or mock)
 * @param {string} sessionId
 * @param {string | null} bearerToken value from Authorization header
 * @param {string} body raw request body
 * @returns {Promise<{ status: number, body: string }>}
 */
export async function handlePut(kv, sessionId, bearerToken, body) {
  if (body.length > MAX_BODY_BYTES) {
    return { status: 413, body: "Payload too large" };
  }

  if (!bearerToken) return { status: 401, body: "Unauthorized" };

  const data = validatePayload(body);
  if (!data) return { status: 400, body: "Invalid payload" };

  const existingToken = await kv.get(sessionId + TOKEN_SUFFIX);
  if (existingToken !== null && existingToken !== bearerToken) {
    return { status: 403, body: "Forbidden" };
  }

  const opts = { expirationTtl: SESSION_TTL };

  await kv.put(sessionId + TOKEN_SUFFIX, bearerToken, opts);
  await kv.put(sessionId, JSON.stringify(data), opts);

  return { status: 200, body: "OK" };
}
