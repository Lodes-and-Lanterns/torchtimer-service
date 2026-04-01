import { assertEquals } from "@std/assert";
import worker from "../worker.js";
import { makeMockKV, validPayloadJson } from "./fixtures.js";

function makeEnv(isDev = true) {
  return {
    TORCHTIMER_SESSIONS: makeMockKV(),
    ENVIRONMENT: isDev ? "dev" : "production",
  };
}

// SESSION PATTERN
//////////////////

Deno.test("worker: returns 404 for unrecognized path", async () => {
  const req = new Request("https://x.invalid/foo");
  const res = await worker.fetch(req, makeEnv());

  assertEquals(res.status, 404);
  assertEquals(await res.text(), "Not found");
});

Deno.test("worker: returns 404 for session ID shorter than 6 chars", async () => {
  const req = new Request("https://x.invalid/session/abc12");
  const res = await worker.fetch(req, makeEnv());

  assertEquals(res.status, 404);
  assertEquals(await res.text(), "Not found");
});

Deno.test("worker: returns 404 for session ID longer than 36 chars", async () => {
  const req = new Request("https://x.invalid/session/" + "a".repeat(37));
  const res = await worker.fetch(req, makeEnv());
  assertEquals(res.status, 404);
  assertEquals(await res.text(), "Not found");
});

Deno.test("worker: returns 404 for session ID with special characters", async () => {
  const req = new Request("https://x.invalid/session/abc-123!");
  const res = await worker.fetch(req, makeEnv());

  assertEquals(res.status, 404);
  assertEquals(await res.text(), "Not found");
});

Deno.test("worker: accepts session ID at minimum length (6 chars)", async () => {
  const req = new Request("https://x.invalid/session/abc123");
  const res = await worker.fetch(req, makeEnv());

  assertEquals(res.status, 404); // Routing matched; KV has no session, so 404 from handleGet
  assertEquals(await res.text(), "Session not found");
});

Deno.test("worker: accepts session ID at maximum length (36 chars)", async () => {
  const req = new Request("https://x.invalid/session/" + "a".repeat(36));
  const res = await worker.fetch(req, makeEnv());

  assertEquals(res.status, 404);
  assertEquals(await res.text(), "Session not found");
});

// OPTIONS
//////////

Deno.test("worker: OPTIONS returns 204", async () => {
  const req = new Request("https://x.invalid/session/abc123", {
    method: "OPTIONS",
  });

  const res = await worker.fetch(req, makeEnv());

  assertEquals(res.status, 204);
});

// METHOD NOT ALLOWED
/////////////////////

Deno.test("worker: POST returns 405", async () => {
  const req = new Request("https://x.invalid/session/abc123", {
    method: "POST",
  });

  const res = await worker.fetch(req, makeEnv());

  assertEquals(res.status, 405);
});

Deno.test("worker: PATCH returns 405", async () => {
  const req = new Request("https://x.invalid/session/abc123", {
    method: "PATCH",
  });

  const res = await worker.fetch(req, makeEnv());

  assertEquals(res.status, 405);
});

// BEARER TOKEN EXTRACTION
//////////////////////////

Deno.test("worker: strips Bearer prefix from Authorization header", async () => {
  const env = makeEnv();

  const putReq = new Request("https://x.invalid/session/abc123", {
    method: "PUT",
    body: validPayloadJson(),
    headers: { "Authorization": "Bearer mytoken" },
  });

  await worker.fetch(putReq, env);

  const delReq = new Request("https://x.invalid/session/abc123", {
    method: "DELETE",
    headers: { "Authorization": "Bearer mytoken" },
  });

  assertEquals((await worker.fetch(delReq, env)).status, 200);
});

Deno.test("worker: Bearer prefix match is case-insensitive", async () => {
  const env = makeEnv();

  const putReq = new Request("https://x.invalid/session/abc123", {
    method: "PUT",
    body: validPayloadJson(),
    headers: { "Authorization": "BEARER mytoken" },
  });

  await worker.fetch(putReq, env);

  const delReq = new Request("https://x.invalid/session/abc123", {
    method: "DELETE",
    headers: { "Authorization": "bearer mytoken" },
  });

  assertEquals((await worker.fetch(delReq, env)).status, 200);
});

Deno.test("worker: missing Authorization header results in 401", async () => {
  const req = new Request("https://x.invalid/session/abc123", {
    method: "PUT",
    body: validPayloadJson(),
  });

  const res = await worker.fetch(req, makeEnv());

  assertEquals(res.status, 401);
});
