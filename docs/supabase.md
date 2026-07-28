# Supabase Setup

This project includes the MVP database migration at:

`supabase/migrations/20260728150500_create_mvp_tables.sql`

It creates:

- `plans`
- `participants`
- `availability`
- `venues`
- `votes`
- `final_plans`

The migration also adds enum types, foreign keys, indexes, updated-at triggers, and RLS on every table.

## Apply Locally

With the Supabase CLI installed:

```bash
supabase init
supabase start
supabase db reset
```

## Apply To A Hosted Supabase Project

Link the project, then push migrations:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

## Security Model

RLS is enabled but direct anonymous table policies are intentionally not added yet.

For this no-account invite-link MVP, the safer next step is to write Next.js API routes that use `SUPABASE_SERVICE_ROLE_KEY` server-side and scope every read/write by `invite_code`. That avoids exposing broad anonymous write permissions from the browser.

Expected environment variables for that next step:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Vercel Environment Variables

In Supabase:

1. Open your project.
2. Go to **Project Settings** > **API**.
3. Copy the project URL into `NEXT_PUBLIC_SUPABASE_URL`.
4. Copy the anon public key into `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. Copy the service role key into `SUPABASE_SERVICE_ROLE_KEY`.

In Vercel:

1. Open the `actually-free` project.
2. Go to **Settings** > **Environment Variables**.
3. Add all three variables for Production, Preview, and Development.
4. Redeploy the latest `main` branch.

Keep `SUPABASE_SERVICE_ROLE_KEY` server-only. Do not prefix it with `NEXT_PUBLIC_`.

## Backend Routes

The app now persists through these Next.js API routes:

- `POST /api/plans`
- `GET /api/plans/:inviteCode`
- `POST /api/plans/:inviteCode/participants`
- `PUT /api/plans/:inviteCode/votes`
- `PUT /api/plans/:inviteCode/final`

If the Supabase environment variables are missing, the UI falls back to demo browser state and shows a notice.
