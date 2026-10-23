-- Simula backend-only persistence. No public/authenticated access to workspace data.
begin;
create table if not exists public.simula_records (
  workspace text not null check (workspace ~ '^[a-f0-9]{64}$'),
  kind text not null check (kind ~ '^[a-z_]{1,40}$'),
  id text not null,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace, kind, id)
);
alter table public.simula_records enable row level security;
revoke all on table public.simula_records from public, anon, authenticated;
grant select, insert, update, delete on table public.simula_records to service_role;
-- Deliberately no anon/authenticated policy: requests must pass through the authenticated Node API.
create or replace function public.simula_touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.simula_touch_updated_at() from public, anon, authenticated;
drop trigger if exists simula_records_updated_at on public.simula_records;
create trigger simula_records_updated_at before update on public.simula_records
for each row execute function public.simula_touch_updated_at();
comment on table public.simula_records is 'Encrypted Simula records. Backend service role only; workspace authorization enforced in the Node API.';
commit;
