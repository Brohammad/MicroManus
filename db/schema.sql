-- MicroManus schema — run in Supabase SQL editor

create extension if not exists "pgcrypto";

-- Profiles (auth.users mirror)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  unlocked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  delta integer not null check (delta <> 0),
  reason text not null check (reason in ('coupon', 'stripe', 'chat', 'refund')),
  ref_id text,
  created_at timestamptz not null default now()
);

-- Idempotent grants (Stripe session, one-time coupon per user, etc.)
create unique index if not exists credit_transactions_reason_ref_unique
  on public.credit_transactions (reason, ref_id)
  where ref_id is not null;

create index if not exists credit_transactions_user_id_idx
  on public.credit_transactions (user_id);

create or replace function public.get_credit_balance(p_user_id uuid)
returns integer
language sql
stable
as $$
  select coalesce(sum(delta), 0)::integer
  from public.credit_transactions
  where user_id = p_user_id;
$$;

create table if not exists public.llm_settings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  provider text not null check (provider in ('openrouter', 'openai')),
  model_key text not null,
  api_key_encrypted text not null,
  base_url text,
  updated_at timestamptz not null default now()
);

create table if not exists public.chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'New research',
  model_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chats_user_id_idx on public.chats (user_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content text not null default '',
  tool_calls jsonb,
  created_at timestamptz not null default now()
);

create index if not exists messages_chat_id_idx on public.messages (chat_id);

create table if not exists public.artifacts (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats (id) on delete cascade,
  type text not null check (type in ('pdf')),
  title text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references public.chats (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  model_key text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cache_read_tokens integer not null default 0,
  cache_write_tokens integer not null default 0,
  pricing_version text not null,
  cost_usd numeric(12, 6) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists usage_events_chat_id_idx on public.usage_events (chat_id);
create index if not exists usage_events_user_id_idx on public.usage_events (user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.llm_settings enable row level security;
alter table public.chats enable row level security;
alter table public.messages enable row level security;
alter table public.artifacts enable row level security;
alter table public.usage_events enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create policy "credits_select_own" on public.credit_transactions
  for select using (auth.uid() = user_id);

create policy "settings_select_own" on public.llm_settings
  for select using (auth.uid() = user_id);

create policy "settings_upsert_own" on public.llm_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "chats_own" on public.chats
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "messages_own" on public.messages
  for all using (
    exists (
      select 1 from public.chats c
      where c.id = chat_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.chats c
      where c.id = chat_id and c.user_id = auth.uid()
    )
  );

create policy "artifacts_own" on public.artifacts
  for all using (
    exists (
      select 1 from public.chats c
      where c.id = chat_id and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.chats c
      where c.id = chat_id and c.user_id = auth.uid()
    )
  );

create policy "usage_select_own" on public.usage_events
  for select using (auth.uid() = user_id);

create policy "usage_insert_own" on public.usage_events
  for insert with check (auth.uid() = user_id);

-- Storage bucket for PDF artifacts (create via dashboard or):
-- insert into storage.buckets (id, name, public) values ('artifacts', 'artifacts', false);
