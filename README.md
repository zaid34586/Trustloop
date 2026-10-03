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
2. In the Supabase Dashboard, open **SQL Editor** and run **each** of the
   following files (in order):
   - [`supabase/schema.sql`](supabase/schema.sql)
   - [`supabase/documents.sql`](supabase/documents.sql)
   - [`supabase/chunks.sql`](supabase/chunks.sql)
   - [`supabase/questionnaires.sql`](supabase/questionnaires.sql)
   These create the `profiles`, `documents`, `document_chunks`,
   `questionnaires` and `questions` tables with Row Level Security, the
   `search_chunks` function, and the private storage buckets. **You must
   run this SQL before signing up.**
3. Go to **Settings > API** and copy the **Project URL** and the
   **anon/public key**.

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
