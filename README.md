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
- `document_chunks` + GIN index + the `search_chunks` function + RLS
- `questionnaires` + RLS (full CRUD)
- `questions` + review columns (`edited_by_user`, `approved_at`) +
  `updated_at` trigger + RLS (full CRUD)
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
   - the `search_chunks` function (must be `security invoker`).

Note: the older split scripts (`schema.sql`, `documents.sql`,
`chunks.sql`, `questionnaires.sql`, `review.sql`) are kept for
reference only — `all.sql` is the authoritative script.

### 2. Configure environment variables

Copy the example file and fill in your Supabase values:

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=<your project url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your anon key>
AI_API_KEY=<your Anthropic API key>
AI_MODEL=<e.g. claude-sonnet-4-20250514>
```

Never commit `.env` files — they are already excluded via `.gitignore`.
All Supabase settings are read from environment variables only.

### 3. Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploying

The repo is ready for Vercel. Import it in Vercel and add the two
`NEXT_PUBLIC_*` environment variables from step 2 in the project settings,
then deploy.

## Routes

| Route                        | Description                                    |
| ---------------------------- | ---------------------------------------------- |
| `/`                          | Landing page                                   |
| `/signup`                    | Create an account (email + password)           |
| `/login`                     | Log in                                         |
| `/dashboard`                 | Dashboard (protected)                          |
| `/dashboard/documents`       | Documents (protected, placeholder)             |
| `/dashboard/questionnaires`  | Questionnaires (protected, placeholder)        |
| `/dashboard/settings`        | Settings (protected, placeholder)              |
