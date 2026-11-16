# Accounts: what exists and how to add a real backend

## Current state (static, no server)

The site is fully usable **without an account**. Progress, notes, favorites and
settings live in IndexedDB (`apps/web/src/lib/storage.ts`).

Signing in is **optional** and currently **local only**:

- `apps/web/src/lib/auth.ts` exposes an `AuthApi` interface.
- `localAuth` stores `{ name, avatarColor, createdAt }` in the Dexie `profile`
  table. No password, no email, no network.
- Cross-device transfer works without a server via a **sync code**
  (`apps/web/src/lib/sync.ts`): `JB1:` + base64url of the full progress export.
  Paste it on another device to restore everything.
- Full JSON export/import is available on `/profile`.

This is honest about its limits: clearing browser data loses the profile, which
is why the UI pushes backups and sync codes.

## Adding real accounts

A real cross-device account needs a server. The project already has the Rust
side ready for it:

| Piece | Location | Purpose |
|---|---|---|
| `crates/pdd-core` | `crates/pdd-core` | Shared content model + validation |
| `crates/pdd-srs` | `crates/pdd-srs` | Same SM-2 scheduler as the client |
| `apps/api` (planned) | `apps/api` | Axum + SQLx + Postgres |

Suggested contract (Axum, `utoipa` OpenAPI):

```
POST /auth/register      { email, password }        -> { access, refresh, user }
POST /auth/login         { email, password }        -> { access, refresh, user }
POST /auth/refresh       { refresh }                -> { access }
GET  /me                                          -> user
PUT  /me               { name }                    -> user
POST /sync/push        [attempts, srs, notes]      -> { cursor }
GET  /sync/pull?since=<cursor>                    -> { attempts, srs, notes, cursor }
GET  /leaderboard?window=week&mode=exam           -> [{ userId, name, score }]
POST /challenges       { mode, questionIds }       -> { code }
```

Rules of thumb:

- passwords: `argon2id`, short-lived access JWT (15 min) + httpOnly refresh cookie;
- sync: idempotent upsert keyed by `clientAttemptId`, `updatedAt` cursor, tombstones for deletes;
- rate limit auth and sync endpoints; validate progress server-side (max attempts/second);
- never trust client XP — recompute from attempts.

## Wiring a remote adapter

1. Implement `AuthApi` against the contract above (e.g. `createRemoteAuth`).
2. In `apps/web/src/pages/ProfilePage.tsx`, replace `localAuth` with your adapter.
3. Keep the guest path intact: when `current()` returns `null`, the profile
   creation card is shown, and all training features keep working.

Nothing in the exam engine, SRS or content layer depends on authentication, so
the switch is isolated to the profile page and the sync layer.