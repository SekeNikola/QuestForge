-- Add user_id to scope campaigns per API key holder.
-- Existing campaigns without a user_id will have an empty string
-- and will no longer be visible in the app (expected — start fresh).

alter table public.campaigns
  add column if not exists user_id text not null default '';

create index if not exists campaigns_user_id_idx
  on public.campaigns (user_id);
