# Skate5

Skateboarding class management platform. Successor to skate4 (Firebase-based). Built on a modern stack designed for AI-assisted development.

## Stack

- **Monorepo**: pnpm workspaces
- **Backend**: Fastify 5 + Drizzle ORM + PostgreSQL
- **Frontend**: React 19 + Vite 6 + Tailwind CSS 4 + shadcn/ui
- **Auth**: Firebase Auth (token validation on backend via firebase-admin)
- **Language**: TypeScript 5.7 (strict mode)

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
pnpm dev                  # Start all packages in dev mode
pnpm dev:api              # Start API server only (port 3000)
pnpm dev:web              # Start web dev server only (port 5173)
pnpm build                # Build all packages
pnpm typecheck            # Type-check all packages
pnpm db:generate          # Generate Drizzle migrations from schema changes
pnpm db:migrate           # Run pending migrations
pnpm db:studio            # Open Drizzle Studio (DB browser)
```

## Development Guidelines

### Database
- Schema lives in `packages/api/src/db/schema.ts`
- After modifying the schema, run `pnpm db:generate` then `pnpm db:migrate`
- Use Drizzle query builder, not raw SQL

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
- Put types used by both api and web in `packages/shared/src/types.ts`
- Keep this package dependency-free (types only)

## Domain Concepts

- **Class**: A scheduled skateboarding session with instructors
- **Signup/RSVP**: A user's attendance response (yes/no/maybe/none)
- **Grid**: The schedule breakdown for a class (time slots, instructors, badges)
- **Badge**: A tag for categorizing grid entries (e.g., skill level, activity type)
- **Chat**: Group or direct messaging tied to topics (classes) or between users

## Environment Variables

### API (`packages/api/.env`)
- `DATABASE_URL` - PostgreSQL connection string
- `FIREBASE_PROJECT_ID` - Firebase project ID for token verification
- `PORT` - Server port (default 3000)

### Web (`packages/web/.env`)
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
