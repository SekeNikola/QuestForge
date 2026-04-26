-- QuestForge campaigns table
-- Stores full game state as JSONB so the app can save/resume from anywhere

create table if not exists public.campaigns (
  id            uuid primary key default gen_random_uuid(),
  campaign_id   text unique not null,       -- UUID from localStorage (client-generated)
  display_name  text not null,              -- "{Theme} · {Character name}"
  theme         text not null,
  kids_mode     boolean not null default false,
  state         jsonb not null,             -- full serialized GameState
  message_count integer not null default 0, -- quick stat for UI
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Auto-update updated_at on every write
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

-- RLS: enable but allow full anon access (personal project — user owns the Supabase project)
alter table public.campaigns enable row level security;

create policy "Allow all anon access"
  on public.campaigns
  for all
  to anon
  using (true)
  with check (true);
