import { assertEquals } from "@std/assert";
import {
  MAX_DURATION_MS,
  MAX_TORCHES,
  validatePayload,
} from "../src/validate.js";
import { validPayload, validPayloadJson } from "./fixtures.js";

// VALID PAYLOADS
/////////////////

Deno.test("validatePayload: accepts a valid single running torch", () => {
  const result = validatePayload(validPayloadJson());

  assertEquals(result?.v, 1);
  assertEquals(result?.torches.length, 1);
});

Deno.test("validatePayload: accepts a paused torch with remaining", () => {
  const body = JSON.stringify(validPayload({
    torch: { state: "paused", deathAt: null, remaining: 1800000 },
  }));

  const result = validatePayload(body);

  assertEquals(result?.torches[0].state, "paused");
  assertEquals(result?.torches[0].remaining, 1800000);
});

Deno.test("validatePayload: accepts a dead torch", () => {
  const body = JSON.stringify(validPayload({
    torch: { state: "dead", deathAt: null, remaining: null },
  }));

  const result = validatePayload(body);

  assertEquals(result?.torches[0].state, "dead");
});

Deno.test("validatePayload: accepts an unlit torch", () => {
  const body = JSON.stringify(validPayload({
    torch: { state: "unlit", deathAt: null, remaining: null },
  }));

  const result = validatePayload(body);

  assertEquals(result?.torches[0].state, "unlit");
});

Deno.test("validatePayload: accepts maximum torch count", () => {
  const payload = {
    v: 1,
    ts: 1700000000000,
    torches: Array.from({ length: MAX_TORCHES }, () => ({
      duration: 3600000,
      state: "running",
      deathAt: 1700003600000,
      remaining: null,
    })),
  };

  const result = validatePayload(JSON.stringify(payload));

  assertEquals(result?.torches.length, MAX_TORCHES);
});

Deno.test("validatePayload: accepts duration exactly at MAX_DURATION_MS", () => {
  const payload = validPayload({ torch: { duration: MAX_DURATION_MS } });
  const result = validatePayload(JSON.stringify(payload));

  assertEquals(result?.torches[0].duration, MAX_DURATION_MS);
});

Deno.test("validatePayload: accepts ts of zero", () => {
  const payload = { ...validPayload(), ts: 0 };
  const result = validatePayload(JSON.stringify(payload));

  assertEquals(result?.ts, 0);
});

Deno.test("validatePayload: accepts v greater than 1", () => {
  const payload = { ...validPayload(), v: 2 };
  const result = validatePayload(JSON.stringify(payload));

  assertEquals(result?.v, 2);
});

// INVALID JSON
///////////////

Deno.test("validatePayload: rejects malformed JSON", () => {
  assertEquals(validatePayload("{not json"), null);
});

Deno.test("validatePayload: rejects empty string", () => {
  assertEquals(validatePayload(""), null);
});

Deno.test("validatePayload: rejects JSON array at top level", () => {
  assertEquals(validatePayload("[]"), null);
});

Deno.test("validatePayload: rejects JSON null", () => {
  assertEquals(validatePayload("null"), null);
});

Deno.test("validatePayload: rejects JSON string", () => {
  assertEquals(validatePayload('"hello"'), null);
});

// INVALID TOP-LEVEL SHAPE
//////////////////////////

Deno.test("validatePayload: rejects extra top-level keys", () => {
  const payload = { ...validPayload(), extra: "bad" };
  assertEquals(validatePayload(JSON.stringify(payload)), null);
});

Deno.test("validatePayload: rejects non-integer v", () => {
  const payload = { ...validPayload(), v: 1.5 };
  assertEquals(validatePayload(JSON.stringify(payload)), null);
});

Deno.test("validatePayload: rejects v < 1", () => {
  const payload = { ...validPayload(), v: 0 };
  assertEquals(validatePayload(JSON.stringify(payload)), null);
});

Deno.test("validatePayload: rejects string ts", () => {
  const payload = { ...validPayload(), ts: "1700000000000" };
  assertEquals(validatePayload(JSON.stringify(payload)), null);
});

Deno.test("validatePayload: rejects negative ts", () => {
  const payload = { ...validPayload(), ts: -1 };
  assertEquals(validatePayload(JSON.stringify(payload)), null);
});

Deno.test("validatePayload: rejects missing torches", () => {
  const { torches: _, ...payload } = validPayload();
  assertEquals(validatePayload(JSON.stringify(payload)), null);
});

Deno.test("validatePayload: rejects empty torches array", () => {
  const payload = { ...validPayload(), torches: [] };
  assertEquals(validatePayload(JSON.stringify(payload)), null);
});

Deno.test("validatePayload: rejects too many torches", () => {
  const payload = {
    ...validPayload(),
    torches: Array.from({ length: MAX_TORCHES + 1 }, () => ({
      duration: 3600000,
      state: "running",
      deathAt: 1700003600000,
      remaining: null,
    })),
  };

  assertEquals(validatePayload(JSON.stringify(payload)), null);
});

// INVALID TORCH SHAPE
//////////////////////

Deno.test("validatePayload: rejects extra torch keys", () => {
  const payload = validPayload();
  payload.torches[0].label = "injected";
  assertEquals(validatePayload(JSON.stringify(payload)), null);
});

Deno.test("validatePayload: rejects null torch", () => {
  const payload = { v: 1, ts: 1700000000000, torches: [null] };
  assertEquals(validatePayload(JSON.stringify(payload)), null);
});

Deno.test("validatePayload: rejects torch array inside torches", () => {
  const payload = { v: 1, ts: 1700000000000, torches: [[]] };
  assertEquals(validatePayload(JSON.stringify(payload)), null);
});

Deno.test("validatePayload: rejects non-integer duration", () => {
  const payload = validPayload({ torch: { duration: 3600.5 } });
  assertEquals(validatePayload(JSON.stringify(payload)), null);
});

Deno.test("validatePayload: rejects duration of zero", () => {
  const payload = validPayload({ torch: { duration: 0 } });
  assertEquals(validatePayload(JSON.stringify(payload)), null);
});

Deno.test("validatePayload: rejects duration exceeding ceiling", () => {
  const payload = validPayload({ torch: { duration: MAX_DURATION_MS + 1 } });
  assertEquals(validatePayload(JSON.stringify(payload)), null);
});

Deno.test("validatePayload: rejects invalid state string", () => {
  const payload = validPayload({ torch: { state: "burning" } });
  assertEquals(validatePayload(JSON.stringify(payload)), null);
});

Deno.test("validatePayload: rejects numeric state", () => {
  const payload = validPayload({ torch: { state: 1 } });
  assertEquals(validatePayload(JSON.stringify(payload)), null);
});

Deno.test("validatePayload: rejects string deathAt", () => {
  const payload = validPayload({ torch: { deathAt: "1700003600000" } });
  assertEquals(validatePayload(JSON.stringify(payload)), null);
});

Deno.test("validatePayload: rejects negative deathAt", () => {
  const payload = validPayload({ torch: { deathAt: -1 } });
  assertEquals(validatePayload(JSON.stringify(payload)), null);
});

Deno.test("validatePayload: rejects non-integer remaining", () => {
  const payload = validPayload({
    torch: { state: "paused", deathAt: null, remaining: 1800.5 },
  });

  assertEquals(validatePayload(JSON.stringify(payload)), null);
});

Deno.test("validatePayload: rejects negative remaining", () => {
  const payload = validPayload({
    torch: { state: "paused", deathAt: null, remaining: -1 },
  });

  assertEquals(validatePayload(JSON.stringify(payload)), null);
});

// STATE / FIELD RELATIONSHIP ENFORCEMENT
/////////////////////////////////////////

Deno.test("validatePayload: rejects running torch with remaining set", () => {
  const payload = validPayload({
    torch: { state: "running", deathAt: 1700003600000, remaining: 1800000 },
  });

  assertEquals(validatePayload(JSON.stringify(payload)), null);
});

Deno.test("validatePayload: rejects running torch with null deathAt", () => {
  const payload = validPayload({
    torch: { state: "running", deathAt: null, remaining: null },
  });

  assertEquals(validatePayload(JSON.stringify(payload)), null);
});

Deno.test("validatePayload: rejects running torch with deathAt of zero", () => {
  const payload = validPayload({
    torch: { state: "running", deathAt: 0, remaining: null },
  });

  assertEquals(validatePayload(JSON.stringify(payload)), null);
});

Deno.test("validatePayload: rejects paused torch with deathAt set", () => {
  const payload = validPayload({
    torch: { state: "paused", deathAt: 1700003600000, remaining: 1800000 },
  });

  assertEquals(validatePayload(JSON.stringify(payload)), null);
});

Deno.test("validatePayload: rejects paused torch with null remaining", () => {
  const payload = validPayload({
    torch: { state: "paused", deathAt: null, remaining: null },
  });

  assertEquals(validatePayload(JSON.stringify(payload)), null);
});

Deno.test("validatePayload: accepts paused torch with remaining of zero", () => {
  const payload = validPayload({
    torch: { state: "paused", deathAt: null, remaining: 0 },
  });

  const result = validatePayload(JSON.stringify(payload));

  assertEquals(result?.torches[0].remaining, 0);
});

Deno.test("validatePayload: rejects dead torch with deathAt set", () => {
  const payload = validPayload({
    torch: { state: "dead", deathAt: 1700003600000, remaining: null },
  });

  assertEquals(validatePayload(JSON.stringify(payload)), null);
});

Deno.test("validatePayload: rejects dead torch with remaining set", () => {
  const payload = validPayload({
    torch: { state: "dead", deathAt: null, remaining: 1000 },
  });

  assertEquals(validatePayload(JSON.stringify(payload)), null);
});

// MISSING REQUIRED TORCH KEYS
///////////////////////////////

Deno.test("validatePayload: rejects torch missing duration key", () => {
  const payload = validPayload();
  const { duration: _, ...torchWithout } = payload.torches[0];

  payload.torches[0] = torchWithout;

  assertEquals(validatePayload(JSON.stringify(payload)), null);
});

Deno.test("validatePayload: rejects torch missing state key", () => {
  const payload = validPayload();
  const { state: _, ...torchWithout } = payload.torches[0];

  payload.torches[0] = torchWithout;

  assertEquals(validatePayload(JSON.stringify(payload)), null);
});

Deno.test("validatePayload: rejects torch missing deathAt key", () => {
  const payload = validPayload();
  const { deathAt: _, ...torchWithout } = payload.torches[0];

  payload.torches[0] = torchWithout;

  assertEquals(validatePayload(JSON.stringify(payload)), null);
});

Deno.test("validatePayload: rejects torch missing remaining key", () => {
  const payload = validPayload();
  const { remaining: _, ...torchWithout } = payload.torches[0];

  payload.torches[0] = torchWithout;

  assertEquals(validatePayload(JSON.stringify(payload)), null);
});

// TIMER_VISIBLE (optional top-level boolean)
/////////////////////////////////////////////

Deno.test("validatePayload: accepts payload with timerVisible true", () => {
  const payload = { ...validPayload(), timerVisible: true };
  const result = validatePayload(JSON.stringify(payload));
  assertEquals(result?.timerVisible, true);
});

Deno.test("validatePayload: accepts payload with timerVisible false", () => {
  const payload = { ...validPayload(), timerVisible: false };
  const result = validatePayload(JSON.stringify(payload));
  assertEquals(result?.timerVisible, false);
});

Deno.test("validatePayload: accepts payload without timerVisible", () => {
  const result = validatePayload(validPayloadJson());
  assertEquals("timerVisible" in (result ?? {}), false);
});

Deno.test("validatePayload: rejects non-boolean timerVisible", () => {
  const payload = { ...validPayload(), timerVisible: 1 };
  assertEquals(validatePayload(JSON.stringify(payload)), null);
});

Deno.test("validatePayload: rejects string timerVisible", () => {
  const payload = { ...validPayload(), timerVisible: "true" };
  assertEquals(validatePayload(JSON.stringify(payload)), null);
});

// TORCH ID (optional slot identifier)
//////////////////////////////////////

Deno.test("validatePayload: accepts torch with id null", () => {
  const payload = validPayload({ torch: { id: null } });
  const result = validatePayload(JSON.stringify(payload));
  assertEquals(result?.torches[0].id, null);
});

Deno.test("validatePayload: accepts torch with id string", () => {
  const payload = validPayload({ torch: { id: "t1" } });
  const result = validatePayload(JSON.stringify(payload));
  assertEquals(result?.torches[0].id, "t1");
});

Deno.test("validatePayload: accepts torch without id key", () => {
  const result = validatePayload(validPayloadJson());
  assertEquals("id" in (result?.torches[0] ?? {}), false);
});

Deno.test("validatePayload: rejects torch with id as number", () => {
  const payload = validPayload({ torch: { id: 1 } });
  assertEquals(validatePayload(JSON.stringify(payload)), null);
});

Deno.test("validatePayload: rejects torch with id as empty string", () => {
  const payload = validPayload({ torch: { id: "" } });
  assertEquals(validatePayload(JSON.stringify(payload)), null);
});

Deno.test("validatePayload: rejects torch with id exceeding max length", () => {
  const payload = validPayload({ torch: { id: "x".repeat(65) } });
  assertEquals(validatePayload(JSON.stringify(payload)), null);
});

// MULTI-TORCH: one invalid torch invalidates the whole payload
///////////////////////////////////////////////////////////////

Deno.test("validatePayload: rejects payload where second torch is invalid", () => {
  const payload = {
    v: 1,
    ts: 1700000000000,
    torches: [
      {
        duration: 3600000,
        state: "running",
        deathAt: 1700003600000,
        remaining: null,
      },
      { duration: 3600000, state: "burning", deathAt: null, remaining: null }, // Invalid state
    ],
  };

  assertEquals(validatePayload(JSON.stringify(payload)), null);
});
