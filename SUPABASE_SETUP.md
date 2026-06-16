# Account sync with Supabase

Account sync is **optional**. Without it, Seasons & Sights works fully — saved
trips just live in the browser. Add Supabase and trips sync across devices behind
a sign-in.

## 1. Create a project

1. Go to <https://supabase.com> and create a free account + a new project.
2. Pick a region near your users and set a database password (you won't need it
   for this app).

## 2. Create the trips table

In the project: **SQL Editor → New query**, paste the contents of
[`supabase/schema.sql`](supabase/schema.sql), and click **Run**. This creates the
`trips` table and a row-level-security policy so each user can only read and write
their own trips.

## 3. Copy your keys

**Project Settings → API**, then copy:

- **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
- **anon / public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Put them in `.env.local` for local dev:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

The `anon` key is safe to expose in the browser — RLS is what protects the data.
Never put the **service_role** key in this app.

For production, add the same two variables in **Vercel → Project → Settings →
Environment Variables**, then redeploy.

## 4. (Optional) Tune auth

By default Supabase requires **email confirmation** on sign-up — new users get a
confirmation link before they can sign in. To skip that for quicker testing:
**Authentication → Providers → Email → turn off "Confirm email"**.

Supabase's built-in email sender is rate-limited; for real traffic configure your
own SMTP under **Authentication → Emails**.

## How sync works

- Trips are always saved to the browser first (offline-first), so the planner
  stays instant and works without a connection.
- When signed in, saving or deleting a trip also writes to Supabase, and signing
  in on a new device pulls your trips down and merges them (any trips made while
  signed out are uploaded).
