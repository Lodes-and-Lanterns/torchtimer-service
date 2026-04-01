/**
 * In-memory KV mock for use in Deno tests.
 * Mirrors the Workers KV API surface used by session.js.
 */
export function makeMockKV() {
  const store = new Map();

  return {
    // deno-lint-ignore require-await
    async get(key) { // async in real Workers KV API
      return store.get(key) ?? null;
    },
    // deno-lint-ignore require-await
    async put(key, value, _opts) { // async in real Workers KV API
      store.set(key, value);
    },
    // deno-lint-ignore require-await
    async delete(key) { // async in real Workers KV API
      store.delete(key);
    },
    // Test-only: inspect raw store contents
    _get(key) {
      return store.get(key) ?? null;
    },
    _size() {
      return store.size;
    },
  };
}

/** Returns a minimal valid payload for a single running torch. */
export function validPayload(overrides = {}) {
  return {
    v: 1,
    ts: 1700000000000,
    torches: [
      {
        duration: 3600000,
        state: "running",
        deathAt: 1700003600000,
        remaining: null,
        ...overrides.torch,
      },
    ],
    ...overrides.top,
  };
}

export function validPayloadJson(overrides = {}) {
  return JSON.stringify(validPayload(overrides));
}
