-- Buglog 002: logs point at the tub's hidden id, and the log buttons get their actions.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- Run this BEFORE the new app version goes live (the new app asks for tubs.id).
-- It is all-or-nothing: if any step fails, nothing changes.

begin;

-- 1. Give every tub a hidden id number. Existing tubs get numbered automatically.
--    The code (rubber-ducky-1) stays as the sticker name, but it can now be renamed
--    without breaking anything, because logs will point at the id instead.
alter table public.tubs add column id bigint generated always as identity;

-- 2. Logs get a tub_id column, filled in from the tub code they already have.
alter table public.logs add column tub_id bigint;
update public.logs l
   set tub_id = t.id
  from public.tubs t
 where t.code = l.tub_code;
alter table public.logs alter column tub_id set not null;

-- 3. Logs stop pointing at the code. Dropping tub_code also drops its link to tubs.code.
alter table public.logs drop column tub_code;

-- 4. The id becomes the tub's real key; the code just has to stay unique.
alter table public.tubs drop constraint tubs_pkey;
alter table public.tubs add primary key (id);
alter table public.tubs add constraint tubs_code_key unique (code);
alter table public.logs
  add constraint logs_tub_id_fkey foreign key (tub_id) references public.tubs (id);
create index logs_tub_id_logged_at_idx on public.logs (tub_id, logged_at desc);

-- 5. Food type, for the Food button. "other" means the food is typed in food_other.
alter table public.logs add column food_type text
  check (food_type in ('protein', 'vegetables', 'calcium', 'leaf_litter_bark', 'other'));
alter table public.logs add column food_other text;

-- 6. Old logs used protein / vegetables / calcium as the action. Those become
--    action "food" with that food type, so old and new logs look the same.
alter table public.logs drop constraint logs_action_check;
update public.logs
   set food_type = action, action = 'food'
 where action in ('protein', 'vegetables', 'calcium');

-- 7. The six buttons are the only actions allowed.
alter table public.logs add constraint logs_action_check
  check (action in ('watered', 'food', 'problem', 'moved', 'babies_seen', 'harvested_or_sold'));

-- 8. Food logs must say what food; other logs must not. "Other" needs the typed food.
alter table public.logs add constraint logs_food_type_only_for_food
  check ((action = 'food') = (food_type is not null));
alter table public.logs add constraint logs_food_other_only_for_other
  check (
    (food_type = 'other' and food_other is not null and btrim(food_other) <> '')
    or (food_type is distinct from 'other' and food_other is null)
  );

commit;

-- Permissions are unchanged from 001: anyone can read tubs (now including the id),
-- and only logged-in users can read, add or delete logs. Nobody can edit a log.
