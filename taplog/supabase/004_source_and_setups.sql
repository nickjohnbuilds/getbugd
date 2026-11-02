-- Buglog 004: where each log came from, and dated tub setups.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.
--
-- !! RUN THIS BEFORE THE NEW APP VERSION GOES LIVE. !!
-- The new app sends logs.source with every save and reads tub_setups. Against a
-- database without this file, every log save fails ("column source does not
-- exist") and the setup page can't load. (The home page falls back to a plain
-- grid if it can't read setups, but logging would still be broken.)
--
-- It is all-or-nothing: if any step fails, nothing changes.

begin;

-- 1. Where a log came from.
--    tile   = tapped a tub tile on the Home page (the app adds ?via=home)
--    nfc    = tapped an NFC sticker (new stickers carry ?via=nfc)
--    voice  = voice entry (not built yet)
--    import = brought in from somewhere else (not built yet)
--    Logs saved before this run stay empty (null).
--
--    Best guess, on purpose: a tub page opened with no ?via at all is saved as
--    'nfc'. All 20 stickers written so far are plain /t/<code> with no ?via,
--    and today the only other way in (a bookmark or typed link) is rare. Once
--    the stickers are rewritten with ?via=nfc, the app can save null for no-via
--    links instead, and 'nfc' becomes exact.
alter table public.logs
  add column source text
  check (source in ('tile', 'nfc', 'voice', 'import'));

-- 2. Tub setups: dated snapshots of how a tub is set up. A change is saved as a
--    new row, never by editing an old one, so the rows are the tub's history.
--    The newest effective_at is the current setup.
create table public.tub_setups (
  id bigint generated always as identity primary key,
  tub_id bigint not null references public.tubs (id),
  effective_at timestamptz not null default now(),
  enclosure_type text
    check (enclosure_type in ('tub', 'culture_cup', 'vivarium', 'terrarium')),
  main_species text,
  also_living_here text,
  container text,           -- e.g. '6 qt', '18x18x24 in'
  substrate text,
  temp_min_f integer,
  temp_max_f integer,
  humidity_min_pct integer check (humidity_min_pct between 0 and 100),
  humidity_max_pct integer check (humidity_max_pct between 0 and 100),
  ventilation text,
  notes text,
  -- Who saved it. Filled in automatically with the logged-in user. If that user
  -- is ever deleted, the setup stays and this goes empty.
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  -- Min can't be above max. Only checked when both are filled in.
  constraint tub_setups_temp_range check (temp_min_f <= temp_max_f),
  constraint tub_setups_humidity_range check (humidity_min_pct <= humidity_max_pct)
);

create index tub_setups_tub_id_effective_at_idx
  on public.tub_setups (tub_id, effective_at desc);

-- 3. Row Level Security, same style as 001: start from nothing, then hand out
--    only what the app needs. Logged-in users can read, add, or delete a setup
--    (delete is for fixing a mistake). Nobody can edit one: a change is a new
--    snapshot. Visitors who are not logged in get nothing.
alter table public.tub_setups enable row level security;

revoke all on public.tub_setups from anon, authenticated;

grant select, insert, delete on public.tub_setups to authenticated;
create policy "Logged-in users can read tub setups"
  on public.tub_setups for select
  to authenticated
  using (true);
create policy "Logged-in users can add tub setups"
  on public.tub_setups for insert
  to authenticated
  with check (true);
create policy "Logged-in users can delete tub setups"
  on public.tub_setups for delete
  to authenticated
  using (true);

commit;

-- Permissions on tubs and logs are unchanged.
--
-- Known gap, same as 003, not fixed here: the insert rules are "with check
-- (true)", so a logged-in user could send a different created_by on purpose and
-- the database would accept it. To close that later, change the insert policy's
-- check to (created_by = auth.uid()) on logs and tub_setups. That is a policy
-- change, so it's left for a deliberate decision.
