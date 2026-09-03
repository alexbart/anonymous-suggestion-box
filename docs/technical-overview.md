# Technical Overview

## Anonymous Suggestion Box — Architecture, Stack, and Deployment

This document is a high-level technical overview for engineers
and technical reviewers. It covers the stack, the architecture,
the security model, the environment variables, and how to deploy
the system to Vercel with a Neon Postgres backend.

For the end-user perspective, see `nurse-user-guide.md`. For the
management-side guide, see `admin-user-guide.md`.

---

## 1. Stack

| Layer            | Choice                                 | Why                                      |
|------------------|----------------------------------------|------------------------------------------|
| Package manager  | pnpm workspaces                        | Light, fast, no Turborepo for an MVP     |
| Web frontend     | React 19 + Vite 8 + TypeScript         | Mobile-first, fast HMR                   |
| Styling          | Tailwind CSS v4                        | Utility classes, zero config             |
| HTTP client      | Axios                                  | Simple, with `withCredentials` support   |
| Web host         | Vercel                                 | Free tier, GitHub deploys                |
| API              | Node.js 20+ + Fastify 4 + TypeScript   | Fast, schema-friendly, large plugin set  |
| Auth             | bcryptjs + jsonwebtoken + @fastify/cookie | Standard, no third-party identity      |
| File uploads     | @fastify/multipart                     | Streams to disk, enforces size limits    |
| Rate limit       | @fastify/rate-limit                    | Per-route, in-memory store               |
| Validation       | Zod                                    | Same schemas on both sides (planned)     |
| Database         | PostgreSQL via Neon                     | Managed, serverless-friendly             |
| ORM              | Prisma                                 | Type-safe queries, easy migrations       |
| API host         | Vercel Functions (planned)              | Same platform as the web app             |

The MVP is deliberately small. There is no GraphQL, no message
queue, no Redis. Everything runs as a single Fastify process
plus a single Postgres database. This keeps the attack surface
small and the demo reliable.

---

## 2. Repository layout

```
anonymous-suggestion-box/
├── apps/
│   ├── api/                          # Fastify + Prisma API
│   │   ├── src/
│   │   │   ├── server.ts             # entrypoint (loads .env, listens)
│   │   │   ├── app.ts                # Fastify app builder
│   │   │   ├── db.ts                 # Prisma client singleton
│   │   │   ├── routes/
│   │   │   │   ├── suggestions.ts    # public nurse routes
│   │   │   │   ├── admin-auth.ts     # login / logout / me
│   │   │   │   ├── admin-suggestions.ts  # dashboard data
│   │   │   │   └── admin-attachments.ts  # authenticated downloads
│   │   │   ├── middleware/
│   │   │   │   └── admin-auth.ts     # requireAdmin
│   │   │   ├── validation/
│   │   │   │   └── suggestion.ts     # Zod schemas
│   │   │   ├── utils/
│   │   │   │   ├── reference-code.ts
│   │   │   │   ├── password.ts
│   │   │   │   ├── admin-auth.ts     # JWT sign/verify
│   │   │   │   └── file-storage.ts
│   │   │   └── types/
│   │   │       └── fastify.d.ts
│   │   ├── uploads/                  # gitignored; physical attachments
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── .env / .env.example
│   │
│   └── web/                          # React + Vite frontend
│       ├── src/
│       │   ├── App.tsx               # view-switcher (no router yet)
│       │   ├── lib/
│       │   │   └── api.ts            # Axios instance + 401 interceptor
│       │   ├── api/
│       │   │   └── admin.ts          # typed admin API client
│       │   └── pages/
│       │       ├── SubmitSuggestion.tsx
│       │       ├── CheckSuggestion.tsx
│       │       ├── AdminLogin.tsx
│       │       └── AdminDashboard.tsx
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       └── .env / .env.example
│
├── packages/
│   └── shared/                       # cross-package TypeScript types
│       └── src/index.ts
│
├── prisma/
│   ├── schema.prisma                 # database schema
│   ├── seed.ts                       # initial admin user
│   └── migrations/                   # committed, version-controlled
│
├── scripts/
│   └── prisma.mjs                    # cross-platform prisma wrapper
│
├── docs/                             # user + admin + technical guides
│
├── .env.example                      # root env example
├── .gitignore
├── .npmrc
├── .nvmrc                            # Node 20.11.0
├── package.json                      # root, workspace scripts
└── pnpm-workspace.yaml
```

---

## 3. Database schema

Three application tables and one admin table. The schema is
intentionally narrow: there are no identity columns on
`Suggestion`, by design.

```prisma
enum SuggestionCategory {
  PATIENT_CARE STAFFING EQUIPMENT WORKPLACE_SAFETY
  STAFF_WELFARE MANAGEMENT COMMUNICATION OTHER
}
enum SuggestionPriority { LOW NORMAL HIGH URGENT }
enum SuggestionStatus   { NEW UNDER_REVIEW PENDING ACTIONED CLOSED }

model Suggestion {
  id            String              @id @default(cuid())
  referenceCode String              @unique         // e.g. SB-B9FKMU
  category      SuggestionCategory
  message       String
  priority      SuggestionPriority  @default(NORMAL)
  status        SuggestionStatus    @default(NEW)
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt
  attachments   Attachment[]
  notes         SuggestionNote[]
  @@index([status]) @@index([category]) @@index([priority]) @@index([createdAt])
}

model Attachment {
  id           String   @id @default(cuid())
  suggestionId String
  originalName String                          // as supplied by the browser
  storedName   String                          // UUID-based on disk
  mimeType     String
  size         Int
  storagePath  String                          // absolute path (server only)
  createdAt    DateTime @default(now())
  suggestion   Suggestion @relation(...)
  @@index([suggestionId])
}

model SuggestionNote {
  id           String   @id @default(cuid())
  suggestionId String
  note         String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  suggestion   Suggestion @relation(...)
  @@index([suggestionId])
}

model AdminUser {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String                         // bcrypt, 12 rounds
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  @@index([email]) @@index([isActive])
}
```

Migrations are committed under `prisma/migrations/`. Apply them
to any environment with `pnpm db:migrate` (which runs
`prisma migrate deploy`).

---

## 4. Security model

The threat model is:

1. A nurse submits a suggestion. We must not learn who they are.
2. A malicious visitor tries to enumerate suggestions or
   download attachments without authorisation.
3. A leaked JWT should be revocable (or at least expire).
4. A brute-force login attempt should be rate-limited.
5. File uploads must not be able to overwrite or escape the
   upload directory.

The mitigations:

| Concern                          | Mitigation                                                  |
|----------------------------------|-------------------------------------------------------------|
| Nurse identity                   | No identity columns on `Suggestion`                         |
| Suggestion enumeration           | Reference code is opaque + 6 random chars, not sequential    |
| Public attachment listing        | Attachments are returned only on the detail endpoint, which requires admin auth |
| Attachment path traversal        | Stored name is a UUID; original name is metadata only       |
| Brute-force login                | 5 attempts / 15 min per IP via `@fastify/rate-limit`        |
| Public nurse spam                | 10 submissions / 15 min per IP via `@fastify/rate-limit`    |
| JWT in browser JS                | HttpOnly + SameSite cookie (not localStorage)              |
| JWT expiry                       | 8h, signed with `JWT_SECRET`                                |
| Cross-origin abuse               | CORS locked to `WEB_ORIGIN` + `credentials: true`           |
| IP leakage in DB                 | Rate-limit data is in-memory only; IPs are not persisted    |
| Magic-byte / malware in uploads  | Validation is by extension + MIME in the MVP — see *Known limitations* below |

### Known limitations of the MVP

- **No magic-byte / structural file validation.** A user who
  renames `malware.exe` to `photo.jpg` would be blocked by the
  MIME check, but a file that claims to be a PDF and contains
  arbitrary bytes would be stored. Add `file-type` detection
  and a virus scan (e.g. ClamAV) before production.
- **No EXIF / GPS stripping on uploaded images.** Even though
  the dashboard does not display images, the raw bytes are
  served on download. Strip metadata before storage if
  location privacy matters.
- **In-memory rate limit** is per-process. On Vercel Functions
  with cold starts, the limit may be reset on each invocation.
  Use a shared store (e.g. Upstash Redis) if you scale out.
- **The `uploads/` directory is on the API server.** If you
  deploy the API as a stateless function, files will be lost
  across cold starts. Use S3 or a Neon-backed object store for
  production. The `apps/api/src/utils/file-storage.ts` module
  is the single abstraction point — swap the implementation
  without touching the routes.

---

## 5. The status workflow

The API is the only place this is enforced.

```ts
const allowedTransitions: Record<string, string[]> = {
  NEW:          ["UNDER_REVIEW"],
  UNDER_REVIEW: ["PENDING", "ACTIONED"],
  PENDING:      ["UNDER_REVIEW", "ACTIONED"],
  ACTIONED:     ["CLOSED"],
  CLOSED:       [],
};
```

The same map is duplicated in
`apps/web/src/pages/AdminDashboard.tsx` to drive the UI, but if
the two ever drift, the API wins. Invalid transitions return
`409 INVALID_STATUS_TRANSITION`.

---

## 6. Environment variables

| Name              | Required | Where                   | Notes                                                |
|-------------------|----------|-------------------------|------------------------------------------------------|
| `DATABASE_URL`    | yes      | API                     | Postgres URL with `sslmode=require` for Neon        |
| `API_PORT`        | no       | API                     | Default `3001` (unused on Vercel)                    |
| `API_HOST`        | no       | API                     | Default `0.0.0.0`                                    |
| `WEB_ORIGIN`      | yes      | API                     | The deployed web URL, e.g. `https://app.vercel.app` |
| `LOG_LEVEL`       | no       | API                     | Default `info`                                        |
| `NODE_ENV`        | yes      | API                     | `production` on Vercel, `development` locally        |
| `JWT_SECRET`      | yes      | API                     | Long random string; 48+ bytes base64 recommended     |
| `ADMIN_EMAIL`     | yes      | API                     | Used by `db:seed` and the seed script                |
| `ADMIN_PASSWORD`  | yes      | API                     | Min 12 characters; used by `db:seed`                 |
| `VITE_API_URL`    | yes      | Web (build-time)        | The deployed API URL, e.g. `https://api.vercel.app/api/v1` |

The web app reads `VITE_API_URL` at build time. If you change
it, you must rebuild the web app.

---

## 7. Local development

### Prerequisites

- Node.js 20.11.0 (see `.nvmrc`)
- pnpm 9+
- PostgreSQL (local or Neon)

### First-time setup

```bash
# Install dependencies (also handles pnpm links)
pnpm install

# Copy the env files
cp .env.example apps/api/.env
cp .env.example apps/web/.env

# Edit both .env files with your local DATABASE_URL
#   (apps/api/.env is the authoritative one for the API)

# Apply migrations
pnpm db:migrate

# Seed the initial admin
pnpm db:seed

# Run the API
pnpm dev:api

# In another terminal, run the web app
pnpm dev:web
```

By default:

- API:    `http://localhost:3001`
- Web:    `http://localhost:5173`
- Health: `http://localhost:3001/health`

### Common commands

| Command                       | What it does                            |
|-------------------------------|-----------------------------------------|
| `pnpm dev:api`                | Start the API with hot reload           |
| `pnpm dev:web`                | Start the web app with Vite HMR         |
| `pnpm db:migrate`             | Apply pending Prisma migrations         |
| `pnpm db:seed`                | Upsert the admin user from `.env`       |
| `pnpm prisma:format`          | Format `prisma/schema.prisma`           |
| `pnpm prisma:generate`        | Regenerate the Prisma client            |
| `pnpm prisma:studio`          | Open Prisma Studio (browse the DB)      |

### Useful curl snippets

```bash
# Health check
curl -i http://localhost:3001/health

# Submit a suggestion (multipart)
curl -X POST http://localhost:3001/api/v1/suggestions \
  -F "category=STAFFING" \
  -F "priority=HIGH" \
  -F "message=The night shift is understaffed." \
  -F "attachments=@./evidence.pdf;type=application/pdf"

# Public status lookup
curl http://localhost:3001/api/v1/suggestions/SB-XXXXXX

# Admin login (saves cookie to cookies.txt)
curl -c cookies.txt -X POST http://localhost:3001/api/v1/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"LocalAdmin!2026Secure"}'

# Admin summary
curl -b cookies.txt http://localhost:3001/api/v1/admin/dashboard/summary
```

---

## 8. Deployment to Vercel with Neon

### 8.1 Create the Neon database

1. Sign in at <https://neon.tech> and create a project.
2. Copy the **pooled** connection string. It looks like:

   ```
   postgresql://USER:PASSWORD@ep-xxx-pooler.region.aws.neon.tech/verceldb?sslmode=require&channel_binding=require
   ```

   Important: use the **pooled** endpoint (the one with
   `-pooler` in the hostname) when connecting from serverless
   functions, and include `?sslmode=require`.

### 8.2 Apply the schema to Neon

From your local machine, with the Neon URL in
`apps/api/.env`:

```bash
pnpm db:migrate     # runs prisma migrate deploy
pnpm db:seed        # creates the initial admin
```

You can do this once at setup, and re-run it after each new
migration. Vercel itself does not run migrations on deploy in
this MVP.

### 8.3 Deploy the API

Create a `vercel.json` at the repo root (not yet committed in
this MVP) that builds `apps/api` as a Vercel Function, and add
the env vars from §6 in the Vercel project settings.

A minimal `vercel.json`:

```json
{
  "version": 2,
  "builds": [
    { "src": "apps/api/src/server.ts", "use": "@vercel/node" }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "apps/api/src/server.ts" }
  ]
}
```

You will also need to import the source via a small build step
(e.g. `tsc -p apps/api/tsconfig.json` → `apps/api/dist`); see
*Future work* below.

### 8.4 Deploy the web app

- Create a second Vercel project (or use a Monorepo setup) that
  builds `apps/web`.
- Build command: `pnpm --filter web build`
- Output directory: `apps/web/dist`
- Env var: `VITE_API_URL = https://YOUR-API.vercel.app/api/v1`

### 8.5 Health check

`GET /health` should return:

```json
{ "success": true, "data": { "status": "ok", "service": "api", "timestamp": "..." } }
```

Use this as your Vercel health-check URL or your uptime
monitor.

---

## 9. Architecture decisions

A few choices deserve a brief justification so the next
maintainer understands them.

### Why a separate public API and admin API

The nurse endpoint `GET /api/v1/suggestions/:referenceCode`
deliberately returns *only* the reference code and the current
status. It does not return the message, attachments, internal
notes, or any identity data. The admin endpoints return the
full record.

Splitting the routes by audience makes the data model smaller
per endpoint and reduces the chance of a future change
accidentally leaking something sensitive. It also means a
misconfigured reverse proxy can only do so much damage.

### Why a `cuid` for `Suggestion.id` but a `uuid` for `AdminUser.id`

`Suggestion.id` is a `cuid` because it is the primary key on a
table that may grow large and benefits from a sortable, URL-safe
identifier. `AdminUser.id` is a `uuid` because it is shared in
JWTs and we wanted to use the conventional UUID format for
tokens.

The API does not expose either ID to the public. The
`referenceCode` (e.g. `SB-B9FKMU`) is the only public
identifier.

### Why an in-memory rate limiter for now

`@fastify/rate-limit` with the default in-memory store is fine
for a single-process deployment. When the API is deployed as
multiple Vercel Functions, the limit becomes per-instance, which
is less safe. The mitigation is to switch to a shared store
(Upstash Redis is the usual choice) without changing the route
code. This is a small follow-up task.

### Why a `reference-code` instead of a sequential number

`SB-000001` would leak the volume of submissions and make
enumeration easier. The current code uses 6 chars from a
Crockford-style alphabet (no `0`, `1`, `I`, `L`, `O`), giving
~30^6 ≈ 729 million possible codes. Collision is checked
against the database before insert.

### Why we removed any `userId` on `Suggestion`

The product promise is anonymity. The only way to keep that
promise is to never write the identity to the database in the
first place. There is no `userId` because there is no user. A
future analytics feature must be designed to work without
re-identification.

---

## 10. Future work

The MVP is intentionally small. In rough priority order:

1. **Object storage for attachments.** Replace the local
   filesystem with S3 / Cloudflare R2 / Supabase Storage. The
   `file-storage.ts` abstraction is the only change site.
2. **Serverless-safe rate limit.** Move from in-memory to
   Upstash Redis.
3. **Magic-byte validation + virus scan.** Block executables
   hidden as PDFs, scan for malware.
4. **EXIF / GPS stripping.** Strip metadata from images before
   storing.
5. **Pagination on the dashboard.** Currently a single page of
   50 results. Add Next/Prev once list size grows.
6. **Suggesting a real router on the frontend.** Today
   `App.tsx` is a four-state view switcher. When the admin area
   grows (filters saved by user, deep links to specific
   suggestions), introduce React Router.
7. **Split `AdminDashboard.tsx`.** A future refactor should
   break it into:
   - `components/admin/DashboardSummary.tsx`
   - `components/admin/SuggestionFilters.tsx`
   - `components/admin/SuggestionCard.tsx`
   - `components/admin/SuggestionDetail.tsx`
   - `components/admin/SuggestionStatusControl.tsx`
   - `components/admin/SuggestionAttachments.tsx`
   - `components/admin/SuggestionNotes.tsx`
8. **Audit log.** Track which admin made which status change or
   note. Currently all changes are attributed to "an admin"
   but not a specific user.
9. **Email / push notification** to the admin team when a new
   Urgent suggestion arrives.
10. **MFA on the admin login.** Today it is email + password.
    A TOTP factor would harden the only account that can read
    attachments.

---

*For the user perspective, see `nurse-user-guide.md`. For the
management-side guide, see `admin-user-guide.md`.*
