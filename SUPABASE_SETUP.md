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

## 4. (Optional) Google Sign-In

The "Continue with Google" button is always in the sign-in dialog, but it only
works once Google is enabled on the project — until then it returns Supabase's
"provider is not enabled" error rather than doing nothing silently.

**In Google Cloud Console** (console.cloud.google.com):

1. Create (or pick) a project → **APIs & Services → OAuth consent screen**.
   External, fill in the app name and support email.
2. **Credentials → Create credentials → OAuth client ID → Web application**.
3. Under **Authorised redirect URIs** add exactly:
   `https://<your-project-ref>.supabase.co/auth/v1/callback`
   That's Supabase's URL, not your app's — Google redirects to Supabase, which
   then redirects to you.
4. Copy the **client ID** and **client secret**.

**In Supabase** (dashboard):

5. **Authentication → Providers → Google** → enable, paste the client ID and
   secret, save.
6. **Authentication → URL Configuration**:
   - *Site URL*: your production origin, e.g. `https://seasons-and-sights.vercel.app`
   - *Redirect URLs*: add `https://<your-domain>/auth/callback` and, for local
     work, `http://localhost:3000/auth/callback`.

Step 6 is the one that's easy to miss: without the `/auth/callback` entry the
sign-in completes at Google and then dead-ends, because Supabase refuses to
redirect back to an unlisted URL.

Existing email/password accounts and Google accounts with the same address are
linked by Supabase automatically as long as the email is verified, so signing
in with Google later doesn't strand trips saved under the password account.

## 5. (Optional) Tune auth

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
