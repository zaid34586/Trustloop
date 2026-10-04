# Trustloop

**Powered by Rivox**

Trustloop helps small software companies answer customer security
questionnaires automatically using AI. It drafts answers from your own
security documents, and you review and approve everything before it goes
out.

Built with Next.js (App Router), Tailwind CSS and Supabase.

## Setup

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Set up the database — see **[Database setup](#database-setup)** below.
   You must run the SQL **before signing up**, otherwise signups fail
   (the signup trigger needs the `profiles` table).
3. Go to **Settings > API** and copy the **Project URL** and the
   **anon/public key**.

## Database setup

Everything lives in one idempotent script: [`supabase/all.sql`](supabase/all.sql).
It creates, from an empty database and in dependency order:

- `profiles` + the signup trigger (`on_auth_user_created`)
- `documents` + RLS (select/insert/update/delete)
- `document_chunks` + GIN index + the `search_chunks` function (manual
  queries only — the app ranks chunks in `lib/retrieval.ts`) + RLS
- `questionnaires` + RLS (full CRUD)
- `questions` + review columns (`edited_by_user`, `approved_at`) +
  `updated_at` trigger + RLS (full CRUD)
- `ai_usage` (rate limiting: 60 AI calls/hour, 300/day) + RLS
  (select/insert own rows) + `(user_id, created_at)` index
- private storage buckets `documents` and `questionnaires` +
  per-bucket storage policies (own folder only)

Steps:

1. In the Supabase Dashboard, open **SQL Editor** → **New query**.
2. Paste the contents of `supabase/all.sql` and **run it once**.
   The script is safe to run again (every statement is idempotent),
   so you can re-run it after future changes without errors.
3. Paste and run [`supabase/verify.sql`](supabase/verify.sql) — it is
   read-only and prints:
   - all public tables with RLS enabled/disabled (all must be `ENABLED`),
   - every policy (public + storage),
   - both storage buckets (both must show `public = false`),
   - the `search_chunks` function (must be `security invoker`),
   - the `ai_usage` table, policies and index.

Note: the older split scripts (`schema.sql`, `documents.sql`,
`chunks.sql`, `questionnaires.sql`, `review.sql`) are kept for
reference only — `all.sql` is the authoritative script.

### 2. Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=<your project url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon key>

# Public site URL, used for email confirmation / password reset links
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# AI (server-side only, never exposed to the browser)
AI_PROVIDER=openrouter     # or "anthropic" (default: openrouter)
AI_API_KEY=<your OpenRouter or Anthropic API key>
AI_MODEL=<e.g. openai/gpt-4o-mini or claude-sonnet-4-20250514>
AI_MODEL_FALLBACKS=<optional: comma-separated fallback model IDs>
```

- `AI_PROVIDER` — `openrouter` (default) uses
  https://openrouter.ai/api/v1/chat/completions,
  `anthropic` uses the Claude API. Keys starting with `sk-or-`
  always use OpenRouter, whatever `AI_PROVIDER` says.
- `AI_API_KEY` and `AI_MODEL` must match the chosen provider
  (for OpenRouter, `AI_MODEL` is an OpenRouter model id like
  `openai/gpt-4o-mini`).
- `AI_MODEL_FALLBACKS` — optional comma-separated model IDs tried when
  the primary model fails. With OpenRouter they are sent as the
  `models` array so OpenRouter fails over automatically; on top of that
  the app retries once (max 2 retries) when a call fails with HTTP 429,
  5xx, a timeout, or returns text that cannot be parsed as the expected
  JSON. Only **one** `ai_usage` row is counted per request, no matter
  how many retries run.
- Never commit `.env` files — they are already excluded via
  `.gitignore`. No secrets are stored in this repository.

### 3. Configure Supabase Auth URLs

In the Supabase dashboard go to **Authentication → URL configuration**
and add your site URL plus these redirect URLs so confirmation and
password-reset emails can reach the app:

- `http://localhost:3000/auth/callback` (local)
- `https://<your-domain>/auth/callback` (production)

Email confirmation links land on `/auth/callback` → `/login` (with an
"email verified" confirmation), and password reset links land on
`/auth/callback?next=/reset-password` → `/reset-password`.

### 4. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploying

The repo is ready for Vercel. Import it in Vercel and add **all** the
environment variables from step 2 (`NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`, `AI_PROVIDER`,
`AI_API_KEY`, `AI_MODEL`, and optionally `AI_MODEL_FALLBACKS`) in the
project settings, then deploy. Also add your production `/auth/callback`
URL to Supabase's redirect URLs (step 3).

## Routes

| Route                        | Description                                         |
| ---------------------------- | --------------------------------------------------- |
| `/`                          | Landing page                                        |
| `/pricing`                   | Pricing (public)                                    |
| `/about`                     | About (public)                                      |
| `/contact`                   | Contact (public)                                    |
| `/security`                  | Security (public)                                   |
| `/signup`                    | Create an account (email + password)                |
| `/login`                     | Log in (with "Forgot password?" link)               |
| `/forgot-password`           | Request a password reset email                      |
| `/reset-password`            | Set a new password (arrived at from the reset email)|
| `/auth/callback`             | Handles email links: verification → `/login`, reset → `/reset-password` |
| `/dashboard`                 | Dashboard stats (protected)                         |
| `/dashboard/ask`             | Ask questions about your documents (protected)      |
| `/dashboard/documents`       | Upload / manage security documents (protected)      |
| `/dashboard/questionnaires`  | Upload / manage questionnaires (protected)          |
| `/dashboard/questionnaires/[id]` | Review, approve and export answers (protected)  |
| `/dashboard/settings`        | Profile + change password (protected)               |

API routes: `/api/ask`, `/api/documents/process`,
`/api/questionnaires/preview`, `/api/questionnaires/confirm`,
`/api/questionnaires/[id]/export`, `/api/questions/answer`.

AI calls are rate limited per user: **60 requests/hour and 300/day**
(counted in the `ai_usage` table); exceeding either returns HTTP 429.
