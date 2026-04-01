import { assert, assertEquals } from "@std/assert";
import { corsHeaders } from "../src/cors.js";

Deno.test("corsHeaders: production returns exact origin", () => {
  const h = corsHeaders(false);

  assertEquals(
    h["Access-Control-Allow-Origin"],
    "https://torchtimer.lodesandlanterns.com",
  );
});

Deno.test("corsHeaders: dev returns wildcard origin", () => {
  const h = corsHeaders(true);

  assertEquals(h["Access-Control-Allow-Origin"], "*");
});

Deno.test("corsHeaders: includes GET, PUT, DELETE, OPTIONS in allowed methods", () => {
  const h = corsHeaders(false);
  const methods = h["Access-Control-Allow-Methods"];

  assert(methods.includes("GET"));
  assert(methods.includes("PUT"));
  assert(methods.includes("DELETE"));
  assert(methods.includes("OPTIONS"));
});

Deno.test("corsHeaders: allows Authorization header", () => {
  const h = corsHeaders(false);

  assert(h["Access-Control-Allow-Headers"].includes("Authorization"));
});

Deno.test("corsHeaders: allows Content-Type header", () => {
  const h = corsHeaders(false);

  assert(h["Access-Control-Allow-Headers"].includes("Content-Type"));
});
