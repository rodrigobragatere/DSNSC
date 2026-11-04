-- DSNSC — rode no SQL Editor (nuvem) OU use: npx supabase db reset (local)
-- Ver também: supabase/migrations/20261104183000_cadastros.sql

create extension if not exists "pgcrypto";

create table if not exists public.cadastros (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nome text not null,
  email text not null,
  telefone text not null,
  curso text not null,
  tema text not null,
  hero text not null check (hero in ('boy', 'girl')),
  user_agent text,
  origem text default 'dsnsc-web'
);

create index if not exists cadastros_created_at_idx on public.cadastros (created_at desc);
create index if not exists cadastros_email_idx on public.cadastros (email);

alter table public.cadastros enable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant insert, select, update, delete on table public.cadastros to anon, authenticated, service_role;

drop policy if exists "cadastros_insert_anon" on public.cadastros;
create policy "cadastros_insert_anon"
  on public.cadastros
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "cadastros_select_anon" on public.cadastros;
create policy "cadastros_select_anon"
  on public.cadastros
  for select
  to anon, authenticated
  using (true);

drop policy if exists "cadastros_update_anon" on public.cadastros;
create policy "cadastros_update_anon"
  on public.cadastros
  for update
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "cadastros_delete_anon" on public.cadastros;
create policy "cadastros_delete_anon"
  on public.cadastros
  for delete
  to anon, authenticated
  using (true);

comment on table public.cadastros is 'Leads do jogo Dê o Start na sua Carreira (Unifeso)';
