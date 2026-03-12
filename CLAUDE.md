# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun dev          # Start dev server at http://localhost:3000
bun build        # Production build
bun lint         # Run ESLint
```

This project uses `bun` as the package manager (see `bun.lock`).

## Architecture

This is a Next.js 16 App Router project that bridges Google Forms → Neon Postgres → Basecamp. See `.claude/ARCHITECTURE.md` for the full architecture spec, data flow, database schema, API route contracts, and Google Workspace Add-on source.

### What exists now (greenfield)
Only the scaffolded Next.js app exists. Everything below is yet to be built per the spec.

### Planned structure
- `app/` — Pages: dashboard (`/`), submission editor (`/submissions/[id]`), OAuth setup (`/setup`)
- `app/api/` — Routes: webhook receiver, Google Forms schema fetch, Basecamp card creation, OAuth callbacks for Google + Basecamp, submission status update
- `components/` — `TrixEditor` (client-only, loaded with `dynamic(..., { ssr: false })`), `SubmissionCard`, `StatusBadge`
- `lib/` — `db.ts` (Neon client), `google.ts` (OAuth + Forms API), `basecamp.ts` (OAuth + card API), `template.ts` (maps answers → Trix HTML)
- `google-addon/` — Apps Script files (`appsscript.json`, `Code.gs`) deployed as a Google Workspace Add-on

### Key decisions
- **Database**: Neon (serverless Postgres). Two tables: `settings` (key/value for tokens + config) and `submissions` (JSONB response queue).
- **Auth**: No user login — single-operator internal tool. OAuth tokens for Google and Basecamp stored in the `settings` table; both `lib/google.ts` and `lib/basecamp.ts` auto-refresh before every API call.
- **Trix editor**: Basecamp's own rich-text editor; its HTML output is accepted natively by the Basecamp card API.
- **Webhook security**: Inbound requests from Apps Script validated via `x-webhook-secret` header against `WEBHOOK_SECRET` env var.

### Required env vars
`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BASECAMP_CLIENT_ID`, `BASECAMP_CLIENT_SECRET`, `WEBHOOK_SECRET`, `DATABASE_URL`
