# Skate5

Skateboarding class management platform. Successor to skate4 (Firebase-based). Built on a modern stack designed for AI-assisted development.

## Stack

- **Monorepo**: pnpm workspaces
- **Backend**: Fastify 5 + Kysely + PostgreSQL
- **Frontend**: React 19 + Vite 6 + Tailwind CSS 4 + shadcn/ui
- **Auth**: Firebase Auth (token validation on backend via firebase-admin)
- **Language**: TypeScript 6 (strict mode)

## Structure

```
packages/
  shared/   - Types and utilities shared between api and web
  api/      - Fastify REST API server
  web/      - React SPA (Vite)
```

## Commands

```bash
pnpm install              # Install all dependencies
pnpm db:up                # Start Postgres via Docker
pnpm db:create <name>     # Create a new TS migration file
pnpm db:migrate           # Run pending migrations
pnpm dev:branch           # Start/reuse one API + web server on branch-derived ports
pnpm dev:branch:restart   # Restart the branch-derived API + web servers
pnpm dev                  # Start all packages in dev mode
pnpm dev:api              # Start API server only (port 3000)
pnpm dev:web              # Start web dev server only (port 5173)
pnpm build                # Build all packages
pnpm lint                 # Lint all packages (type-aware)
pnpm typecheck            # Type-check all packages
```

### Local dev servers

- Prefer `pnpm dev:branch` when working locally. It derives stable API/web ports from the current git branch name, kills duplicate repo dev servers, and reuses the current branch's existing servers when healthy.
- Use `pnpm dev:branch:restart` after changing environment variables or server startup code.
- The script prints the exact API and web URLs. It also writes branch-scoped pids, logs, and `ports.json` under `.dev/<sanitized-branch>/`.
- Plain `pnpm dev`, `pnpm dev:api`, and `pnpm dev:web` still use the default ports (`3000` and `5173`) and can conflict across branches or worktrees.

## Type Safety Rules

- **Never use type assertions** (`as Foo`). Use Zod `.parse()` to validate unknown data and derive the type at runtime.
- **Never use `any`**. Use `unknown` and narrow with Zod or type guards.
- **Never define types manually** if a Zod schema exists — use `z.infer<>`.
- **All API boundaries must be validated at runtime** with Zod schemas (incoming requests, external API responses, fetched config).
- **Prefer compile-time errors over runtime errors.** If the type system can catch it, don't defer to a runtime check.
- **Route contracts live in `packages/shared/src/contract.ts`** — both the API handlers and the frontend client are typed against this contract. Adding or changing a route means updating the contract first; the compiler will guide the rest.
- **DB row → API response mapping** must go through explicit mapper functions (in `packages/api/src/db/mappers.ts`) that validate enum values at runtime rather than using `as` casts.
- **Exhaustive switches** — When switching on a union/enum type, always handle every case and add a `default: _value satisfies never` to get a compile error if a variant is added later.
- ESLint enforces these rules: `consistent-type-assertions: never`, `no-explicit-any`, `no-unsafe-*`. Do not add new `eslint-disable` comments without a justification in the comment.

## Development Guidelines

### Database
- Kysely type definitions in `packages/api/src/db/types.ts`
- Migrations are TypeScript files in `packages/api/src/db/migrations/`
- Create a migration: `pnpm db:create <name>` (generates timestamped `.ts` file with up/down)
- Run migrations: `pnpm db:migrate`
- Use the Kysely query builder; avoid raw SQL unless necessary

### API
- All routes go in `packages/api/src/routes/`
- Every route file exports an async function that takes FastifyInstance
- Use the `authenticate` hook for protected routes
- Request validation with Zod schemas

### Frontend
- Use shadcn/ui components in `packages/web/src/components/ui/`
- API calls go through `packages/web/src/lib/api.ts`
- Routes map to files in `packages/web/src/routes/`
- Use `cn()` utility for conditional class names

### Shared
- Define all data shapes as Zod 4 schemas in `packages/shared/src/schemas.ts`
- Types are derived via `z.infer<>` in `packages/shared/src/types.ts` — never define types manually
- Use shared schemas for request validation in the API and form validation in the frontend
- Zod 4 idioms: use `z.email()` (not `z.string().email()`), `z.iso.datetime()` (not `z.string().datetime()`), `z.int()` (not `z.number().int()`)

## Domain Concepts

- **Class**: A scheduled skateboarding session with instructors
- **Signup/RSVP**: A user's attendance response (yes/no/maybe/none)
- **Grid**: The schedule breakdown for a class (time slots, instructors, badges)
- **Badge**: A tag for categorizing grid entries (e.g., skill level, activity type)
- **Chat**: Group or direct messaging tied to topics (classes) or between users

## Environment Variables

### API (`packages/api/.env`)
- `DATABASE_URL` - PostgreSQL connection string
- `FIREBASE_SERVICE_ACCOUNT_BASE64` - Base64-encoded service account JSON (project-level)
- `FIREBASE_CLIENT_API_KEY` - Web API key (from Firebase Console > Your Apps)
- `FIREBASE_CLIENT_APP_ID` - Web app ID (from Firebase Console > Your Apps)
- `FIREBASE_AUTH_DOMAIN` - Optional, defaults to `{projectId}.firebaseapp.com`
- `RESEND_API_KEY` - Optional locally; required to send email through Resend
- `RESEND_FROM_EMAIL` - Optional sender, defaults to `Skate5 <noreply@rivertrail-labs.com>`
- `RESEND_REPLY_TO` - Optional reply-to override; defaults to `skate5-noreply@mail.rivertrail-labs.com`
- `PORT` - Server port (default 3000)

The frontend has no `.env` — it fetches Firebase config from `GET /api/config` at startup.

## Deployment

- **Hosting**: Railway (Dockerfile-based deploy)
- **Production URL**: https://skate5.rivertrail-labs.com
- **GitHub**: https://github.com/makarandp0/skate5
- **Branch**: `master` (auto-deploys on push)
- **Docker**: Multi-stage build — entrypoint runs migrations then starts server
- **Local prod test**: `pnpm prod:up` (builds image + Postgres on port 3001)

### Deploy workflow
```bash
git push                  # Triggers Railway auto-deploy from master
railway up --detach       # Manual deploy from local (bypasses git)
railway logs              # View production logs
railway status            # Check service health
```

### GitHub CLI

- `gh auth status` may fail in the sandbox because the GitHub token lives in the macOS keyring. If it fails with an invalid token but the user's terminal succeeds, rerun the check with escalated permissions instead of assuming GitHub auth is broken.

### Railway CLI
```bash
railway link --project skate5 --service "skate5 app"   # Link to app service
railway variables list                                  # View env vars
railway variables set KEY=value                         # Set env var
```
