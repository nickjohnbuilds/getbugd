-- Buglog 003: logs remember who saved them, and can carry a count.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to run before or after the app update: the app doesn't send either column yet.
-- It is all-or-nothing: if any step fails, nothing changes.

begin;

-- 1. Who saved the log. Filled in automatically with the logged-in user, so the
--    app doesn't need to send it. Logs saved before this run stay empty (null).
--    If a user is ever deleted in Supabase, their logs stay and this goes empty,
--    instead of the delete being refused.
alter table public.logs
  add column created_by uuid default auth.uid()
  references auth.users (id) on delete set null;

-- 2. How many (babies seen, bugs harvested or sold, ...). Optional; when given,
--    it has to be 1 or more.
alter table public.logs
  add column count integer check (count > 0);

commit;

-- Permissions are unchanged from 001.
--
-- Known gap, not fixed here: the insert rule is "with check (true)", so a
-- logged-in user could send a different created_by on purpose and the database
-- would accept it. To close that later, change the insert policy's check to
-- (created_by = auth.uid()). That is a policy change, so it's left for a
-- deliberate decision.
