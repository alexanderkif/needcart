-- ============================================================================
-- NeedCart — least-privilege grants for the Data API
-- ============================================================================
--
-- Supabase's Data API integration manages grants when you change
-- "Exposed tables" / "Exposed functions". That can revoke EXECUTE from
-- internal RLS helpers and trigger functions, producing errors like:
--
--   permission denied for function is_group_member
--
-- Run this script after changing Data API settings, or whenever table/RPC
-- access is unexpectedly denied. It is idempotent.
--
-- Apply with DBeaver or Supabase SQL Editor as the `postgres` role.
-- ============================================================================

begin;

-- anon never reads or writes app data; Auth/PostgREST still gets schema usage.
revoke all on all tables in schema needcart from anon;
revoke all on needcart.group_overview from anon;
revoke all on all functions in schema needcart from anon;

-- Least-privilege grants for signed-in users.
revoke all on all tables in schema needcart from authenticated;
revoke all on needcart.group_overview from authenticated;

grant select, insert, update on needcart.profiles to authenticated;
grant select, update, delete on needcart.groups to authenticated;
grant select, update, delete on needcart.group_members to authenticated;
grant select, insert, update, delete on needcart.categories to authenticated;
grant select, insert, update on needcart.items to authenticated;
grant select on needcart.item_purchases to authenticated;
grant select on needcart.group_overview to authenticated;

-- RLS helpers. Policies call these even though they are not client RPCs.
grant execute on function needcart.is_group_member(uuid) to authenticated;
grant execute on function needcart.is_group_admin(uuid) to authenticated;
grant execute on function needcart.is_group_owner(uuid) to authenticated;
grant execute on function needcart.shares_group_with(uuid) to authenticated;
grant execute on function needcart.budget_period_start(text, text) to authenticated;

-- Table triggers/defaults must be executable by the role doing the write.
grant execute on function needcart.set_updated_at() to authenticated;
grant execute on function needcart.generate_invite_code() to authenticated;
grant execute on function needcart.validate_group_timezone() to authenticated;
grant execute on function needcart.prevent_group_owner_change() to authenticated;
grant execute on function needcart.prevent_group_member_identity_change() to authenticated;
grant execute on function needcart.prevent_category_group_change() to authenticated;
grant execute on function needcart.ensure_item_category_group() to authenticated;
grant execute on function needcart.prevent_item_group_change() to authenticated;
grant execute on function needcart.guard_item_status() to authenticated;

-- Client RPCs.
grant execute on function needcart.create_group(
  text, text, text, integer, text, text, jsonb
) to authenticated;
grant execute on function needcart.join_group_by_code(text) to authenticated;
grant execute on function needcart.leave_group(uuid) to authenticated;
grant execute on function needcart.rotate_invite_code(uuid) to authenticated;
grant execute on function needcart.purchase_item(uuid, integer, text) to authenticated;
grant execute on function needcart.reorder_item(uuid, text, integer) to authenticated;

-- The Auth trigger is executed by the Auth service, not by app users.
grant usage on schema needcart to supabase_auth_admin;
grant execute on function needcart.handle_new_user() to supabase_auth_admin;

-- Server-side Edge Function access.
grant all on all tables in schema needcart to service_role;
grant all on all sequences in schema needcart to service_role;
grant all on all functions in schema needcart to service_role;
grant select on needcart.group_overview to service_role;

-- PostgREST / Realtime internal roles.
grant usage on schema needcart to anon, authenticated, service_role;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticator') then
    execute 'grant usage on schema needcart to authenticator';
  end if;
  if exists (select 1 from pg_roles where rolname = 'supabase_realtime_admin') then
    execute 'grant usage on schema needcart to supabase_realtime_admin';
    execute 'grant select on all tables in schema needcart to supabase_realtime_admin';
  end if;
end;
$$;

commit;
