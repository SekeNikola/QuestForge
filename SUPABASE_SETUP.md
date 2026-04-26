# Supabase Setup — 5 minutes

## 1. Create a Supabase project
1. Go to https://supabase.com → New project
2. Name it `questforge`, pick a region close to you, set a DB password
3. Wait ~2 min for it to spin up

## 2. Run the migration SQL
In your Supabase dashboard → **SQL Editor** → New query, paste and run:

```sql
create table if not exists public.campaigns (
  id            uuid primary key default gen_random_uuid(),
  campaign_id   text unique not null,
  display_name  text not null,
  theme         text not null,
  kids_mode     boolean not null default false,
  state         jsonb not null,
  message_count integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger campaigns_updated_at
  before update on public.campaigns
  for each row execute function public.set_updated_at();

alter table public.campaigns enable row level security;

create policy "Allow all anon access"
  on public.campaigns for all to anon
  using (true) with check (true);
```

## 3. Get your credentials
In Supabase dashboard → **Settings** → **API**:
- **Project URL** — looks like `https://xxxxxxxxxxxx.supabase.co`
- **anon / public key** — the long `eyJ...` key

## 4. Add credentials to the app
Open QuestForge → Settings (gear icon) → **Cloud Save** section:
- Paste your Project URL
- Paste your anon key
- Click **Save Supabase Config**

That's it. The app auto-saves every campaign turn. Your saved games appear on the setup screen under "Resume a Campaign."

## Deploy to your website
```bash
npm run build
# Upload the dist/ folder to Vercel, Netlify, or any static host
```

Or with Vercel CLI:
```bash
npx vercel --prod
```
