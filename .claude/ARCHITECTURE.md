# Basecamp Form Sync — Architecture & Build Guide

## Project Overview

A lightweight Next.js web app that bridges Google Forms and Basecamp. When a Google Form is submitted, the response is stored as a pending card. The user opens the dashboard, edits the content in a Trix rich-text editor, and sends it to a specific Basecamp project column with a single click.

The Google Forms integration is delivered as a **Google Workspace Add-on** — installed once by an admin, usable by anyone in the org on any form with no scripting required.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Database | Neon.tech (Postgres) via Prisma ORM |
| UI Components | DaisyUI + Tailwind v4 |
| Rich Text Editor | Trix (by Basecamp) |
| Hosting | Vercel |
| Google Integration | Google Workspace Add-on (Apps Script) |
| Auth | Custom OAuth (Google + Basecamp), tokens stored in `settings` table |

---

## Data Flow

```
1. Admin installs Workspace Add-on on a Google Form
2. User submits Google Form
3. Apps Script onFormSubmit trigger fires
4. POST to /api/webhooks/google-forms with form data + shared secret
5. Next.js stores submission in Neon with status = 'pending'
6. Dashboard user opens pending submission
7. Server component fetches submission, calls Google Forms API for field schema
8. Submission data is mapped into a Trix template and pre-populated
9. User edits content, sets card title, and sets target project ID + column ID
10. User clicks "Send to Basecamp"
11. sendToBasecampAction (server action) → Basecamp API creates card
12. Submission status updated to 'sent', project/column IDs recorded
```

---

## Database Schema (Neon / Postgres)

Managed by Prisma. Migration files live in `prisma/migrations/`.

```prisma
model Setting {
  key   String @id
  value String
  @@map("settings")
}

model Submission {
  id                String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  formId            String   @map("form_id")
  responseId        String   @map("response_id")
  responseData      Json     @map("response_data")
  status            String   @default("pending")   // 'pending' | 'sent'
  basecampProjectId String?  @map("basecamp_project_id")
  basecampColumnId  String?  @map("basecamp_column_id")
  createdAt         DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  @@map("submissions")
}
```

**`settings` keys used at runtime:**
- `google_access_token`, `google_refresh_token`
- `basecamp_access_token`, `basecamp_refresh_token`, `basecamp_account_id`
- `basecamp_project_id`, `basecamp_column_id` — org-wide defaults, pre-populate the editor but can be overridden per card
- `form_schema:{formId}` — cached JSON of field labels/order from Google Forms API

**Env vars (Vercel, never in DB):**
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `BASECAMP_CLIENT_ID`, `BASECAMP_CLIENT_SECRET`
- `WEBHOOK_SECRET` — shared secret validated on every inbound webhook
- `DATABASE_URL` — Neon connection string

---

## Project File Structure

```
/
├── app/
│   ├── actions.ts                      # Server actions (mutations called from client components)
│   ├── page.tsx                        # Dashboard — pending submission queue
│   ├── submissions/
│   │   └── [id]/
│   │       └── page.tsx                # Server component: fetches data, renders SubmissionEditor
│   └── setup/
│       └── page.tsx                    # OAuth setup + default project/column config
│
├── app/api/                            # Only routes that must be HTTP endpoints
│   ├── webhooks/
│   │   └── google-forms/
│   │       └── route.ts                # POST — receives Apps Script webhook
│   └── auth/
│       ├── google/
│       │   └── route.ts                # GET — OAuth callback, stores tokens
│       └── basecamp/
│           └── route.ts                # GET — OAuth callback, stores tokens
│
├── components/
│   ├── SubmissionEditor.tsx            # 'use client' — Trix editor + project/column/title inputs + send button
│   ├── TrixEditor.tsx                  # 'use client' — wraps Trix, loaded dynamically (ssr: false)
│   ├── SubmissionCard.tsx              # Dashboard list item
│   └── StatusBadge.tsx                 # pending/sent pill badge
│
├── lib/
│   ├── db.ts                           # Prisma client singleton + typed query helpers
│   ├── types.ts                        # Shared TypeScript types (Answer, FormField, Submission)
│   ├── google.ts                       # Google OAuth token refresh + Forms API calls
│   ├── basecamp.ts                     # Basecamp OAuth token refresh + card creation
│   └── template.ts                     # Maps submission answers into Trix HTML template
│
├── prisma/
│   ├── schema.prisma                   # Prisma schema (no url — configured via prisma.config.ts)
│   └── migrations/                     # Migration history
│
├── prisma.config.ts                    # Prisma 7 config — datasource URL, migration settings
│
└── google-addon/
    ├── appsscript.json                 # Add-on manifest
    └── Code.gs                         # onFormOpen, installTrigger, onFormSubmit
```

---

## Server Actions vs API Routes

Internal data mutations use **Next.js server actions** (`app/actions.ts`), not API routes. Only three routes exist because they must be real HTTP endpoints:

| Route | Why it must be an API route |
|---|---|
| `POST /api/webhooks/google-forms` | Called by Apps Script (external HTTP client) |
| `GET /api/auth/google` | OAuth redirect callback — browser is sent here by Google |
| `GET /api/auth/basecamp` | OAuth redirect callback — browser is sent here by Basecamp |

---

## Server Actions (`app/actions.ts`)

### `sendToBasecampAction(submissionId, title, content, projectId, columnId)`
Calls `createBasecampCard` then `markSubmissionSent`, then redirects to `/`. The `projectId` and `columnId` are per-card (entered in the editor), not global config.

### `saveBasecampConfigAction(projectId, columnId)`
Stores org-wide default project/column IDs in `settings`. These pre-populate the editor inputs but the user can override them per card.

---

## API Route Details

### `POST /api/webhooks/google-forms`

**Validation:** Check `x-webhook-secret` header against `WEBHOOK_SECRET` env var. Return 401 if invalid.

**Request body (sent by Apps Script):**
```json
{
  "responseId": "abc123",
  "formId": "1BxiM...",
  "submittedAt": "2025-01-01T12:00:00Z",
  "answers": [
    { "questionId": "abc123", "answer": "Jane Doe" },
    { "questionId": "def456", "answer": "Lorem ipsum..." }
  ]
}
```

Answers are keyed by `questionId` (not title) to correctly handle branching forms where multiple fields can share the same display name.

**Action:** Insert into `submissions` with `status = 'pending'`.

---

### `GET /api/auth/google` and `GET /api/auth/basecamp`

Standard OAuth2 callbacks. Exchange the `code` param for tokens, store in `settings`.

- Google token endpoint: `POST https://oauth2.googleapis.com/token`
- Basecamp token endpoint: `POST https://launchpad.37signals.com/authorization/token`

OAuth initiation links (in `/setup`) redirect the browser to the provider. These can be plain `<a>` tags pointing to the provider's authorization URL — no route needed.

**Google authorization URL:**
```
https://accounts.google.com/o/oauth2/v2/auth
  ?client_id={GOOGLE_CLIENT_ID}
  &redirect_uri={APP_URL}/api/auth/google
  &response_type=code
  &scope=https://www.googleapis.com/auth/forms.body.readonly
  &access_type=offline&prompt=consent
```

**Basecamp authorization URL:**
```
https://launchpad.37signals.com/authorization/new
  ?type=web_server
  &client_id={BASECAMP_CLIENT_ID}
  &redirect_uri={APP_URL}/api/auth/basecamp
```

---

## Prisma & Database

**Config:** `prisma.config.ts` uses `prisma/config`'s `defineConfig` with `datasource.url: env('DATABASE_URL')`. The `prisma/schema.prisma` datasource block has no `url` (Prisma 7 requirement).

**Client:** `lib/db.ts` uses the singleton pattern to prevent multiple `PrismaClient` instances during Next.js hot reload, and instantiates with `PrismaNeon` adapter from `@prisma/adapter-neon`.

**Migrations:** Always use `bunx prisma migrate dev --name <description>` for schema changes. Never use `db push` after the initial setup.

---

## Submission Editor Flow

`app/submissions/[id]/page.tsx` is a **server component** that:
1. Fetches the submission from the DB
2. Fetches org-wide default `basecamp_project_id` / `basecamp_column_id` from settings (in parallel)
3. Calls `getFormFields(formId)` → Google Forms API (cached in settings)
4. Calls `buildTrixHtml(answers, schema)` to produce the pre-populated HTML
5. Renders `<SubmissionEditor>` with all data as props

`components/SubmissionEditor.tsx` is a **client component** that:
- Holds state for title, projectId, columnId, and editor HTML
- Pre-populates projectId/columnId from the org-wide defaults (overridable per card)
- Renders `<TrixEditor>` (dynamically imported, ssr: false)
- Calls `sendToBasecampAction` on submit

---

## Template Mapping (`lib/template.ts`)

Merges raw form answers with the ordered field schema into Trix-compatible HTML. Questions are rendered in **schema order** (Google Forms API field order), not submission order.

Placeholders use **question IDs** (not titles) to correctly handle branching forms where multiple fields may share the same display name. The `ParsedFormField` type carries both `questionId` and `title`; the template engine uses `questionId` as the key and `title` only for display.

```ts
function buildTrixHtml(
  answers: { questionId: string; answer: string }[],
  schema: { questionId: string; title: string; type: string }[]
): string
```

Placeholder format in templates: `{{questionId}}`

Example output:
```html
<h2>Full Name</h2><p>Jane Doe</p>
<h2>Project Description</h2><p>Lorem ipsum dolor sit amet...</p>
```

---

## Google OAuth (`lib/google.ts`)

- `getGoogleAccessToken()` — reads tokens from settings, refreshes via `https://oauth2.googleapis.com/token` if needed, stores new token
- `getFormFields(formId)` — calls `GET https://forms.googleapis.com/v1/forms/{formId}`, caches result in settings as `form_schema:{formId}`

Scope required: `https://www.googleapis.com/auth/forms.body.readonly`

---

## Basecamp OAuth (`lib/basecamp.ts`)

- `getBasecampAccessToken()` — same refresh pattern, uses `https://launchpad.37signals.com/authorization/token`
- `createBasecampCard({ title, content, projectId, columnId })` — POSTs to:
  ```
  https://3.basecampapi.com/{accountId}/buckets/{projectId}/card_tables/lists/{columnId}/cards.json
  ```
  `accountId` comes from the `basecamp_account_id` setting. `projectId` and `columnId` are passed per-card.

---

## Trix Editor Component

Trix is browser-only. `TrixEditor` is always imported with `dynamic(..., { ssr: false })`.

Custom element types are declared in `trix.d.ts` at the project root.

---

## Google Workspace Add-on (`google-addon/`)

### `appsscript.json`
```json
{
  "timeZone": "America/New_York",
  "addOns": {
    "common": { "name": "Basecamp Form Sync", "logoUrl": "https://your-logo-url.png" },
    "forms": { "onFormOpenTrigger": { "runFunction": "onFormOpen" } }
  },
  "oauthScopes": [
    "https://www.googleapis.com/auth/forms.currentonly",
    "https://www.googleapis.com/auth/script.scriptapp"
  ]
}
```

### Deployment
1. Create project at [script.google.com](https://script.google.com)
2. Paste `appsscript.json` and `Code.gs`
3. **Deploy → New Deployment → Add-on**
4. In Google Admin Console: **Apps → Google Workspace Marketplace → Private Apps → Add**

---

## Setup Flow (`/setup` page)

1. **Connect Google** — link to Google OAuth authorization URL → callback stores tokens in `settings`
2. **Connect Basecamp** — link to Basecamp OAuth authorization URL → callback stores tokens + `basecamp_account_id`
3. **Default Project/Column** — enter fallback `basecamp_project_id` and `basecamp_column_id`; stored in `settings`; pre-populate the editor but overridable per card
4. **Test webhook** — POST a dummy payload to `/api/webhooks/google-forms` to confirm the pipeline works

---

## Authentication & Security Notes

- No user login on the Next.js app — single-operator internal tool. Protect with a non-guessable Vercel URL or Vercel password protection.
- `WEBHOOK_SECRET` must match between `Code.gs` and the Vercel env var.
- Both `lib/google.ts` and `lib/basecamp.ts` auto-refresh access tokens before every API call.
