# Ziba marketplace

React, Vite, Tailwind CSS v4, and Supabase.

## Connect Supabase

Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL=https://lehtyuahhpqrglnvnxbh.supabase.co` and the public key from the Supabase API settings. Never put a service role key in a `VITE_` variable or browser code.

Run `../backend/supabase/migrations/20260901000000_ziba_schema.sql` in the Supabase SQL Editor. It creates marketplace tables, storage buckets, realtime publication entries, signup profile creation, RLS policies, listing photo checks, order and messaging guards, notifications, and ratings. Do not use the raw pasted draft schema: it grants public access to role applications and does not enforce the listing image rules.

The auth modal supports email/password registration and Google sign-in. To enable Google, configure the Google provider in Supabase Authentication and add the app's preview/deployed origin to Supabase's allowed redirect URLs. Set the provider's OAuth callback URL to the callback shown in the Supabase provider settings.

The Supabase project files live in `../backend/supabase`. From the repository root, link the CLI to the project and deploy the Edge Function named `server`:

```sh
cd backend
supabase link --project-ref lehtyuahhpqrglnvnxbh
supabase functions deploy server
```

The checked-in `backend/supabase/config.toml` disables gateway JWT verification for this function so unauthenticated browser CORS preflights can reach its CORS middleware. The function validates bearer tokens and approved admin roles itself before running protected admin operations. It uses the Supabase project URL and service role key from the Edge Function environment; Supabase supplies these automatically. The service role key must stay in Edge Function secrets.

Create an admin account through Supabase Auth first. After that account has signed in once so its profile exists, grant the role in the SQL Editor:

```sql
insert into public.user_roles(profile_id, role, status, verified_at)
select id, 'admin', 'approved', now()
from public.profiles
where auth_user_id = (select id from auth.users where email = 'admin@example.com')
on conflict (profile_id, role) do update
set status = 'approved', verified_at = now();
```

Admin access is not available through public signup. The admin workspace supports verification decisions, signed document viewing, account suspension/restoration, listing moderation, report resolution, analytics, and demo listing seeding.

## Run locally

```sh
cd frontend
pnpm install --frozen-lockfile
pnpm dev
```

The Vite server uses port 8443 by default and honors `PORT` when set. The repository root also provides `npm run dev`, `npm run build`, and `npm run preview` shortcuts.
