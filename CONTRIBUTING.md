# Contributing to torchtimer-service

Contributions are welcome: bug fixes, validation improvements, and build tooling
changes. This guide covers local setup, conventions, and the PR process.

## Local setup

**Prerequisites:**

- [Deno](https://deno.land/) v2+
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) - install as a
  global binary using either:
  - Deno: `deno install -A -g --name wrangler npm:wrangler` (add `-f` to update
    to latest)
  - npm: `npm i -g wrangler`

### Dev server

Start a local Worker with in-memory KV:

```sh
wrangler dev
# Worker runs at http://localhost:8787
```

Leaving `--env` unset means `ENVIRONMENT` is unset, which the Worker treats as
dev (CORS allows any origin).

You may see a warning about `@cloudflare/workers-tsconfig/tsconfig.json` not
being found. This comes from Wrangler's own internal template and can be
ignored; it does not affect the Worker.

## API

- `PUT /session/:id` — Torchbearer writes torch state (requires
  `Authorization: Bearer <token>`)
- `GET /session/:id` — Players read torch state (no auth required)
- `DELETE /session/:id` — Torchbearer ends a session (requires
  `Authorization: Bearer <token>`)

Sessions auto-expire after 24 hours.

Example requests:

```sh
# Create / update a session
curl -X PUT http://localhost:8787/session/abc12345 \
  -H "Authorization: Bearer my-secret-token" \
  -H "Content-Type: application/json" \
  -d '{"v":1,"ts":1700000000000,"torches":[{"duration":3600000,"state":"running","deathAt":1700003600000,"remaining":null}]}'

# Read a session
curl http://localhost:8787/session/abc12345

# Wrong token so expect 403
curl -X PUT http://localhost:8787/session/abc12345 \
  -H "Authorization: Bearer wrong-token" \
  -H "Content-Type: application/json" \
  -d '{"v":1,"ts":1700001000000,"torches":[{"duration":3600000,"state":"dead","deathAt":null,"remaining":null}]}'
```

## Testing

Unit tests cover `validatePayload`, `handleGet`, `handlePut`, and CORS headers
using an in-memory KV mock. No Wrangler or network access needed.

```sh
deno task test
```

| File                     | What it covers                                                       |
| ------------------------ | -------------------------------------------------------------------- |
| `tests/validate.test.js` | `validatePayload`: schema, field ranges, state values                |
| `tests/session.test.js`  | `handleGet`, `handlePut`, `handleDelete`: auth, KV reads/writes, TTL |
| `tests/cors.test.js`     | `corsHeaders`: dev vs. production origin handling                    |
| `tests/worker.test.js`   | End-to-end routing: method dispatch, 404, OPTIONS                    |

`tests/fixtures.js` provides the in-memory KV mock shared across test files.

**When to add tests:** Any new pure function or request handler should have unit
tests. When fixing a bug, add a regression test that would have caught it before
adding the fix. Don't write tests for coverage alone; write them to document a
real behavior or protect against a real failure mode.

## Deployment

**Prerequisites:**
[Wrangler](https://developers.cloudflare.com/workers/wrangler/)

### First-time setup

1. Create a Cloudflare account (free, no credit card required).
2. Log in: `wrangler login`
3. Create the KV namespace:
   ```sh
   wrangler kv namespace create TORCHTIMER_SESSIONS
   wrangler kv namespace create TORCHTIMER_SESSIONS --preview
   ```
4. Replace the namespace IDs in `wrangler.toml` placeholders.
5. Deploy:
   ```sh
   wrangler deploy --env production
   ```
6. In the Cloudflare dashboard, add a Worker route for
   `torchtimer-sync.lodesandlanterns.com/*` pointing to this Worker (forks will
   need a different value)

## Code conventions

- **Simple.** The Worker runs directly under Wrangler; Deno runs the tests.
- **Minimal dependencies.** Let's try to keep it that way.
- **Pure functions, please.** Validation and CORS logic are pure and
  unit-testable. Keep side-effectful KV and request handling in `session.js` and
  `worker.js`.
- **Module structure.** `worker.js` is the entry point (routing only). Logic
  lives in:
  - `src/session.js`: `handleGet`, `handlePut`, and `handleDelete` request
    handlers
  - `src/validate.js`: `validatePayload` and payload schema constants
  - `src/cors.js`: CORS header generation for dev and production

## Filing issues

Open an [issue](https://github.com/Lodes-and-Lanterns/torchtimer-service) in
this repository for bugs or feature requests.

## Pull requests

1. Fork the repository and create a branch.
2. Make your changes. Test locally using the dev workflow above.
3. Open a PR against `main` with a clear description of what changed and why.
4. CI runs tests automatically. A failing test run blocks merge.

Keep PRs focused. A bug fix and an unrelated refactor are two separate PRs. If
you're unsure whether a larger change is the right direction, open an issue to
discuss first.
