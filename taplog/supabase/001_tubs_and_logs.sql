-- Buglog tables: tubs and logs.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.

-- One row per tub. Code is species-number, lowercase, hyphen: rubber-ducky-1.
create table public.tubs (
  code text primary key check (code ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null
);

-- One row per thing done to a tub.
create table public.logs (
  id bigint generated always as identity primary key,
  tub_code text not null references public.tubs (code),
  logged_at timestamptz not null default now(),
  action text not null check (action in ('watered', 'protein', 'vegetables', 'calcium')),
  note text
);

insert into public.tubs (code, name) values ('rubber-ducky-1', 'Rubber Ducky');

-- Row Level Security: with it on, the database refuses every read and write
-- unless a rule below allows it.
alter table public.tubs enable row level security;
alter table public.logs enable row level security;

-- Start from nothing, then hand out only what the app needs.
revoke all on public.tubs, public.logs from anon, authenticated;

-- Tubs: anyone can read the code and name (the tub page needs this before login).
-- Nobody can add, change or delete tubs from the app.
grant select on public.tubs to anon, authenticated;
create policy "Anyone can read tubs"
  on public.tubs for select
  to anon, authenticated
  using (true);

-- Logs: only logged-in users can read, add, or delete (for Undo). Nobody can edit one.
-- Visitors who are not logged in get nothing.
grant select, insert, delete on public.logs to authenticated;
create policy "Logged-in users can read logs"
  on public.logs for select
  to authenticated
  using (true);
create policy "Logged-in users can add logs"
  on public.logs for insert
  to authenticated
  with check (true);
create policy "Logged-in users can delete logs"
  on public.logs for delete
  to authenticated
  using (true);
