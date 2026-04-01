import { assertEquals } from "@std/assert";
import {
  handleDelete,
  handleGet,
  handlePut,
  MAX_BODY_BYTES,
} from "../src/session.js";
import { makeMockKV, validPayloadJson } from "./fixtures.js";

const SESSION_ID = "abc12345";
const TOKEN = "test-bearer-token";

// HANDLE_GET
/////////////

Deno.test("handleGet: returns 404 when session does not exist", async () => {
  const kv = makeMockKV();
  const result = await handleGet(kv, SESSION_ID);

  assertEquals(result.status, 404);
});

Deno.test("handleGet: returns 200 and stored body when session exists", async () => {
  const kv = makeMockKV();
  const body = validPayloadJson();

  await kv.put(SESSION_ID, body);

  const result = await handleGet(kv, SESSION_ID);

  assertEquals(result.status, 200);
  assertEquals(result.body, body);
  assertEquals(result.json, true);
});

// HANDLE_PUT: PAYLOAD VALIDATION
/////////////////////////////////

Deno.test("handlePut: returns 413 when body exceeds size limit", async () => {
  const kv = makeMockKV();
  const oversized = "x".repeat(MAX_BODY_BYTES + 1);
  const result = await handlePut(kv, SESSION_ID, TOKEN, oversized);

  assertEquals(result.status, 413);
});

Deno.test("handlePut: accepts body exactly at size limit", async () => {
  const kv = makeMockKV();

  const atLimit = "x".repeat(MAX_BODY_BYTES); // Exactly inclusive is allowed
  const result = await handlePut(kv, SESSION_ID, TOKEN, atLimit);

  assertEquals(result.status, 400); // 400 (not 413) on failed JSON parse
});

Deno.test("handlePut: returns 400 for malformed JSON", async () => {
  const kv = makeMockKV();
  const result = await handlePut(kv, SESSION_ID, TOKEN, "{bad");

  assertEquals(result.status, 400);
});

Deno.test("handlePut: returns 400 for invalid payload shape", async () => {
  const kv = makeMockKV();
  const result = await handlePut(kv, SESSION_ID, TOKEN, '{"v":1}');

  assertEquals(result.status, 400);
});

// HANDLE_PUT: AUTH
///////////////////

Deno.test("handlePut: returns 401 when no bearer token is provided", async () => {
  const kv = makeMockKV();
  const result = await handlePut(kv, SESSION_ID, null, validPayloadJson());

  assertEquals(result.status, 401);
});

Deno.test("handlePut: returns 401 for empty string token", async () => {
  const kv = makeMockKV();
  const result = await handlePut(kv, SESSION_ID, "", validPayloadJson());

  assertEquals(result.status, 401);
});

// HANDLE_PUT: NEW SESSION CREATION
///////////////////////////////////

Deno.test("handlePut: creates a new session and returns 200", async () => {
  const kv = makeMockKV();
  const result = await handlePut(kv, SESSION_ID, TOKEN, validPayloadJson());

  assertEquals(result.status, 200);
});

Deno.test("handlePut: stores state under the session id key", async () => {
  const kv = makeMockKV();
  const body = validPayloadJson();

  await handlePut(kv, SESSION_ID, TOKEN, body);

  assertEquals(kv._get(SESSION_ID), body);
});

Deno.test("handlePut: stores token under the token key", async () => {
  const kv = makeMockKV();

  await handlePut(kv, SESSION_ID, TOKEN, validPayloadJson());

  assertEquals(kv._get(SESSION_ID + ":t"), TOKEN);
});

Deno.test("handlePut: state is stored as re-serialized validated JSON", async () => {
  const kv = makeMockKV();
  const body = validPayloadJson(); // Parser should normalize and round-trip must survive re-serialization

  await handlePut(kv, SESSION_ID, TOKEN, body);

  const stored = kv._get(SESSION_ID);
  const parsed = JSON.parse(stored);

  assertEquals(typeof parsed.v, "number");
  assertEquals(Array.isArray(parsed.torches), true);
});

Deno.test("handlePut: timerVisible is preserved in stored JSON", async () => {
  const kv = makeMockKV();
  const body = JSON.stringify({
    ...JSON.parse(validPayloadJson()),
    timerVisible: false,
  });

  await handlePut(kv, SESSION_ID, TOKEN, body);

  const stored = JSON.parse(kv._get(SESSION_ID));

  assertEquals(stored.timerVisible, false);
});

// HANDLE_PUT: SUBSEQUENT UPDATES
/////////////////////////////////

Deno.test("handlePut: allows update with the correct token", async () => {
  const kv = makeMockKV();

  await handlePut(kv, SESSION_ID, TOKEN, validPayloadJson());

  const updated = JSON.stringify({
    v: 1,
    ts: 1700001000000,
    torches: [{
      duration: 3600000,
      state: "paused",
      deathAt: null,
      remaining: 2600000,
    }],
  });

  const result = await handlePut(kv, SESSION_ID, TOKEN, updated);

  assertEquals(result.status, 200);
  assertEquals(JSON.parse(kv._get(SESSION_ID)).ts, 1700001000000);
});

Deno.test("handlePut: rejects update with wrong token", async () => {
  const kv = makeMockKV();

  await handlePut(kv, SESSION_ID, TOKEN, validPayloadJson());

  const result = await handlePut(
    kv,
    SESSION_ID,
    "wrong-token",
    validPayloadJson(),
  );

  assertEquals(result.status, 403);
});

Deno.test("handlePut: wrong token does not overwrite existing state", async () => {
  const kv = makeMockKV();
  const original = validPayloadJson();

  await handlePut(kv, SESSION_ID, TOKEN, original);
  await handlePut(kv, SESSION_ID, "wrong-token", validPayloadJson());

  assertEquals(kv._get(SESSION_ID), original);
});

// HANDLE_GET AFTER HANDLE_PUT ROUND-TRIP
/////////////////////////////////////////

Deno.test("handleGet returns what handlePut wrote", async () => {
  const kv = makeMockKV();
  const body = validPayloadJson();

  await handlePut(kv, SESSION_ID, TOKEN, body);

  const result = await handleGet(kv, SESSION_ID);

  assertEquals(result.status, 200);
  assertEquals(JSON.parse(result.body).v, 1);
});

// HANDLE_DELETE
////////////////

Deno.test("handleDelete: returns 401 when no bearer token", async () => {
  const kv = makeMockKV();

  await handlePut(kv, SESSION_ID, TOKEN, validPayloadJson());

  const result = await handleDelete(kv, SESSION_ID, null);

  assertEquals(result.status, 401);
});

Deno.test("handleDelete: returns 401 for empty string token", async () => {
  const kv = makeMockKV();

  await handlePut(kv, SESSION_ID, TOKEN, validPayloadJson());

  const result = await handleDelete(kv, SESSION_ID, "");

  assertEquals(result.status, 401);
});

Deno.test("handleDelete: returns 404 when session does not exist", async () => {
  const kv = makeMockKV();
  const result = await handleDelete(kv, SESSION_ID, TOKEN);

  assertEquals(result.status, 404);
});

Deno.test("handleDelete: returns 403 when token is wrong", async () => {
  const kv = makeMockKV();

  await handlePut(kv, SESSION_ID, TOKEN, validPayloadJson());

  const result = await handleDelete(kv, SESSION_ID, "wrong-token");

  assertEquals(result.status, 403);
});

Deno.test("handleDelete: returns 200 with correct token", async () => {
  const kv = makeMockKV();

  await handlePut(kv, SESSION_ID, TOKEN, validPayloadJson());

  const result = await handleDelete(kv, SESSION_ID, TOKEN);

  assertEquals(result.status, 200);
});

Deno.test("handleDelete: removes state key", async () => {
  const kv = makeMockKV();

  await handlePut(kv, SESSION_ID, TOKEN, validPayloadJson());
  await handleDelete(kv, SESSION_ID, TOKEN);

  assertEquals(kv._get(SESSION_ID), null);
});

Deno.test("handleDelete: removes token key", async () => {
  const kv = makeMockKV();

  await handlePut(kv, SESSION_ID, TOKEN, validPayloadJson());
  await handleDelete(kv, SESSION_ID, TOKEN);

  assertEquals(kv._get(SESSION_ID + ":t"), null);
});

Deno.test("handleDelete: GET returns 404 after delete", async () => {
  const kv = makeMockKV();

  await handlePut(kv, SESSION_ID, TOKEN, validPayloadJson());
  await handleDelete(kv, SESSION_ID, TOKEN);

  const result = await handleGet(kv, SESSION_ID);

  assertEquals(result.status, 404);
});

Deno.test("handleDelete: wrong token does not remove session", async () => {
  const kv = makeMockKV();

  await handlePut(kv, SESSION_ID, TOKEN, validPayloadJson());
  await handleDelete(kv, SESSION_ID, "wrong-token");

  assertEquals(kv._get(SESSION_ID) !== null, true);
});

Deno.test("handleDelete: session can be re-created after delete", async () => {
  const kv = makeMockKV();

  await handlePut(kv, SESSION_ID, TOKEN, validPayloadJson());
  await handleDelete(kv, SESSION_ID, TOKEN);

  const result = await handlePut(
    kv,
    SESSION_ID,
    "new-token",
    validPayloadJson(),
  );

  assertEquals(result.status, 200);
  assertEquals(kv._get(SESSION_ID + ":t"), "new-token");
});

// DISTINCT SESSION IDS ARE INDEPENDENT
///////////////////////////////////////

Deno.test("handlePut: distinct session IDs do not share state or tokens", async () => {
  const kv = makeMockKV();

  await handlePut(kv, "sess0001", "token-a", validPayloadJson());
  await handlePut(kv, "sess0002", "token-b", validPayloadJson());

  // Wrong token for sess0001 is rejected even if it is correct for sess0002:
  const r1 = await handlePut(kv, "sess0001", "token-b", validPayloadJson());
  assertEquals(r1.status, 403);

  // Correct tokens should still work:
  const r2 = await handlePut(kv, "sess0001", "token-a", validPayloadJson());
  assertEquals(r2.status, 200);

  const r3 = await handlePut(kv, "sess0002", "token-b", validPayloadJson());
  assertEquals(r3.status, 200);
});
