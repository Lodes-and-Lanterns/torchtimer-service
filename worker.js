/* =============================================================================
   worker.js: Cloudflare Worker entry point; routes requests to session handlers.
   ============================================================================= */

import { handleDelete, handleGet, handlePut } from "./src/session.js";
import { corsHeaders } from "./src/cors.js";

const SESSION_PATTERN = /^\/session\/([a-zA-Z0-9]{6,36})$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const match = url.pathname.match(SESSION_PATTERN);

    if (!match) return new Response("Not found", { status: 404 });

    const sessionId = match[1];
    const isDev = env.ENVIRONMENT !== "production";
    const headers = corsHeaders(isDev);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    if (request.method === "GET") {
      const result = await handleGet(env.TORCHTIMER_SESSIONS, sessionId);

      const responseHeaders = result.json
        ? { ...headers, "Content-Type": "application/json" }
        : headers;

      return new Response(result.body, {
        status: result.status,
        headers: responseHeaders,
      });
    }

    if (request.method === "PUT") {
      const body = await request.text();

      const bearerToken =
        request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ??
          null;

      const result = await handlePut(
        env.TORCHTIMER_SESSIONS,
        sessionId,
        bearerToken,
        body,
      );

      return new Response(result.body, { status: result.status, headers });
    }

    if (request.method === "DELETE") {
      const bearerToken =
        request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ??
          null;

      const result = await handleDelete(
        env.TORCHTIMER_SESSIONS,
        sessionId,
        bearerToken,
      );

      return new Response(result.body, { status: result.status, headers });
    }

    return new Response("Method not allowed", { status: 405, headers });
  },
};
