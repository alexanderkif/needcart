-- ============================================================================
-- NeedCart — reference database schema for Supabase / PostgreSQL
-- ============================================================================
--
-- This file is a design reference, not an automatically applied migration.
-- Review it, then copy it into supabase/migrations/<timestamp>_needcart_schema.sql
-- and test with `supabase db reset` before pushing to a real project.
--
-- All application objects live in the `needcart` schema. The built-in
-- `public` schema is intentionally left untouched so this project can share
-- one Supabase database with other applications.
--
-- Design notes:
--   * All money is stored as integer minor units (cents). Never use float
--     for money.
--   * `items` uses soft delete (`deleted_at`) so that Realtime UPDATE events
--     reach other clients reliably. Hard DELETE events are not RLS-checked by
--     Supabase Realtime.
--   * All critical multi-row mutations go through SECURITY DEFINER RPCs:
--     create_group, join_group_by_code, leave_group, rotate_invite_code,
--     purchase_item, reorder_item.
--   * RLS is enabled on every table. The `anon` role has no access to app data.
--     `authenticated` gets only the grants it needs.
--   * Supabase Realtime Postgres Changes respect RLS for SELECT/INSERT/UPDATE.
--     DELETE events are intentionally not used by the client; the client
--     refetches on focus for deletes of groups, members and categories.
--   * `group_overview` is a security_invoker view used by the app for group
--     cards and budget summaries.
--
-- PostgreSQL 15+ is assumed (Supabase current projects).
-- ============================================================================

-- ============================================================================
-- 0. Application schema
-- ============================================================================
--
-- NeedCart lives in its own schema so it can coexist with other projects in
-- the same Supabase database. The built-in `public` schema is left untouched.
-- Expose `needcart` in Supabase Dashboard -> Project Settings -> API ->
-- Exposed schemas, and configure the client with `db: { schema: 'needcart' }`.

create schema if not exists needcart;

comment on schema needcart is
  'NeedCart application schema: tables, RLS policies, RPCs and views';

-- ============================================================================
-- 1. Generic helpers
-- ============================================================================

create or replace function needcart.set_updated_at()
returns trigger
language plpgsql
set search_path = needcart
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 12-character invite code from a 32-character alphabet (no I, O, 0, 1).
-- ~60 bits of entropy. Rate limiting is still recommended at the edge.
create or replace function needcart.generate_invite_code()
returns text
language plpgsql
set search_path = needcart
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_hex text;
  v_result text := '';
  v_byte integer;
  i integer;
begin
  -- Two UUIDs give us 64 hex characters; we need 24 for 12 output bytes.
  v_hex := replace(gen_random_uuid()::text, '-', '') ||
           replace(gen_random_uuid()::text, '-', '');

  for i in 1..12 loop
    v_byte := get_byte(decode(substr(v_hex, (i - 1) * 2 + 1, 2), 'hex'), 0);
    v_result := v_result || substr(v_alphabet, (v_byte % length(v_alphabet)) + 1, 1);
  end loop;

  return v_result;
end;
$$;

-- Start of the current budget period in the group's timezone.
-- `none` returns -infinity internally; the view hides it from clients.
create or replace function needcart.budget_period_start(
  p_period text,
  p_timezone text
)
returns timestamptz
language sql
stable
set search_path = needcart
as $$
  select case p_period
    when 'week' then
      date_trunc('week', now() at time zone p_timezone) at time zone p_timezone
    when 'month' then
      date_trunc('month', now() at time zone p_timezone) at time zone p_timezone
    else
      '-infinity'::timestamptz
  end;
$$;

-- ============================================================================
-- 2. Profiles
-- ============================================================================

create table needcart.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null
    check (char_length(btrim(display_name)) between 1 and 60),
  avatar_url text,
  locale text not null default 'en'
    check (locale in ('en', 'ru', 'es', 'de', 'pt-BR', 'fr', 'sr-Latn', 'it')),
  theme_mode text not null default 'system'
    check (theme_mode in ('light', 'dark', 'system')),
  accent_color text not null default '#F5B301'
    check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on needcart.profiles
for each row execute function needcart.set_updated_at();

-- Creates a profile for every new Supabase Auth user.
-- Email magic-link users fall back to the email local-part; OAuth metadata
-- (full_name / avatar_url) is used automatically if providers are added later.
create or replace function needcart.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = needcart
as $$
declare
  v_name text;
  v_avatar text;
  v_locale text;
begin
  v_name := coalesce(
    nullif(btrim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data->>'name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'User'
  );
  v_name := left(v_name, 60);

  v_avatar := coalesce(
    nullif(new.raw_user_meta_data->>'avatar_url', ''),
    nullif(new.raw_user_meta_data->>'picture', '')
  );

  v_locale := lower(left(coalesce(new.raw_user_meta_data->>'locale', 'en'), 2));
  if v_locale = 'sr' then
    v_locale := 'sr-Latn';
  elsif v_locale = 'pt' then
    v_locale := 'pt-BR';
  end if;
  if v_locale not in ('en', 'ru', 'es', 'de', 'pt-BR', 'fr', 'sr-Latn', 'it') then
    v_locale := 'en';
  end if;

  insert into needcart.profiles (id, display_name, avatar_url, locale)
  values (new.id, v_name, v_avatar, v_locale)
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Shared databases may contain leftovers from an earlier partial install.
drop trigger if exists needcart_on_auth_user_created on auth.users;

create trigger needcart_on_auth_user_created
after insert on auth.users
for each row execute function needcart.handle_new_user();

-- ============================================================================
-- 3. Groups and memberships
-- ============================================================================

create table needcart.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null
    check (char_length(btrim(name)) between 1 and 80),
  description text
    check (description is null or char_length(description) <= 500),
  owner_id uuid not null references needcart.profiles(id) on delete restrict,
  invite_code text not null unique default needcart.generate_invite_code()
    check (invite_code ~ '^[A-HJ-NP-Z2-9]{12}$'),
  currency text not null default 'USD'
    check (currency ~ '^[A-Z]{3}$'),
  budget_cents integer
    check (budget_cents is null or budget_cents >= 0),
  budget_period text not null default 'none'
    check (budget_period in ('none', 'week', 'month')),
  timezone text not null default 'UTC'
    check (char_length(timezone) between 1 and 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger groups_set_updated_at
before update on needcart.groups
for each row execute function needcart.set_updated_at();

-- Groups can only be created through create_group().
-- This trigger validates timezone updates made directly by the owner.
create or replace function needcart.validate_group_timezone()
returns trigger
language plpgsql
set search_path = needcart
as $$
begin
  if not exists (
    select 1 from pg_timezone_names where name = new.timezone
  ) then
    raise exception 'Invalid timezone' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger groups_validate_timezone
before insert or update of timezone on needcart.groups
for each row execute function needcart.validate_group_timezone();

-- Ownership transfer is intentionally post-MVP.
create or replace function needcart.prevent_group_owner_change()
returns trigger
language plpgsql
set search_path = needcart
as $$
begin
  if new.owner_id <> old.owner_id then
    raise exception 'Ownership transfer is not available yet'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger groups_prevent_owner_change
before update of owner_id on needcart.groups
for each row execute function needcart.prevent_group_owner_change();

create table needcart.group_members (
  group_id uuid not null references needcart.groups(id) on delete cascade,
  user_id uuid not null references needcart.profiles(id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner', 'admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index group_members_user_id_idx
  on needcart.group_members (user_id);

-- Exactly one owner membership row per group.
create unique index group_members_one_owner_idx
  on needcart.group_members (group_id)
  where role = 'owner';

-- Owner can promote/demote members, but cannot rewrite identities.
create or replace function needcart.prevent_group_member_identity_change()
returns trigger
language plpgsql
set search_path = needcart
as $$
begin
  if new.group_id <> old.group_id or new.user_id <> old.user_id then
    raise exception 'Group membership identity cannot be changed'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger group_members_prevent_identity_change
before update of group_id, user_id on needcart.group_members
for each row execute function needcart.prevent_group_member_identity_change();

-- ============================================================================
-- 4. Categories and items
-- ============================================================================

create table needcart.categories (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references needcart.groups(id) on delete cascade,
  name text not null
    check (char_length(btrim(name)) between 1 and 40),
  color text not null default '#F5B301'
    check (color ~ '^#[0-9A-Fa-f]{6}$'),
  icon text not null default 'tag'
    check (char_length(icon) between 1 and 40),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index categories_group_name_idx
  on needcart.categories (group_id, lower(btrim(name)));

create index categories_group_sort_idx
  on needcart.categories (group_id, sort_order, name);

create trigger categories_set_updated_at
before update on needcart.categories
for each row execute function needcart.set_updated_at();

create or replace function needcart.prevent_category_group_change()
returns trigger
language plpgsql
set search_path = needcart
as $$
begin
  if new.group_id <> old.group_id then
    raise exception 'Category cannot be moved between groups'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger categories_prevent_group_change
before update of group_id on needcart.categories
for each row execute function needcart.prevent_category_group_change();

create table needcart.items (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references needcart.groups(id) on delete cascade,
  category_id uuid references needcart.categories(id) on delete set null,
  name text not null
    check (char_length(btrim(name)) between 1 and 120),
  -- Free text for parity with the original app: "2 packages", "300 g", etc.
  quantity text not null default '1'
    check (char_length(btrim(quantity)) between 1 and 40),
  description text
    check (description is null or char_length(description) <= 500),
  -- Unit price. The planned line total is unit price × quantity multiplier.
  price_cents integer
    check (price_cents is null or price_cents >= 0),
  is_checked boolean not null default false,
  created_by uuid references needcart.profiles(id) on delete set null,
  checked_by uuid references needcart.profiles(id) on delete set null,
  checked_at timestamptz,
  -- Soft delete keeps Realtime UPDATE events working and preserves history.
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint items_checked_consistency check (
    (is_checked = false and checked_by is null and checked_at is null)
    or
    (is_checked = true and checked_by is not null and checked_at is not null)
  )
);

create index items_group_active_idx
  on needcart.items (group_id, is_checked)
  where deleted_at is null;

create index items_group_category_idx
  on needcart.items (group_id, category_id)
  where deleted_at is null;

create index items_group_name_idx
  on needcart.items (group_id, name)
  where deleted_at is null;

create trigger items_set_updated_at
before update on needcart.items
for each row execute function needcart.set_updated_at();

-- A category must belong to the same group as its item.
create or replace function needcart.ensure_item_category_group()
returns trigger
language plpgsql
set search_path = needcart
as $$
begin
  if new.category_id is not null and not exists (
    select 1
    from needcart.categories c
    where c.id = new.category_id
      and c.group_id = new.group_id
  ) then
    raise exception 'Category does not belong to the item group'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger items_ensure_category_group
before insert or update of category_id, group_id on needcart.items
for each row execute function needcart.ensure_item_category_group();

create or replace function needcart.prevent_item_group_change()
returns trigger
language plpgsql
set search_path = needcart
as $$
begin
  if new.group_id <> old.group_id then
    raise exception 'Item cannot be moved between groups'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger items_prevent_group_change
before update of group_id on needcart.items
for each row execute function needcart.prevent_item_group_change();

-- The only way to check/reorder an item is through purchase_item() /
-- reorder_item(). This trigger blocks a direct client UPDATE of status fields.
create or replace function needcart.guard_item_status()
returns trigger
language plpgsql
set search_path = needcart
as $$
begin
  if (new.is_checked is distinct from old.is_checked)
     or (new.checked_by is distinct from old.checked_by)
     or (new.checked_at is distinct from old.checked_at)
  then
    if coalesce(current_setting('bfm.item_status_change', true), '') <> '1' then
      raise exception
        'Item status can only be changed via purchase_item() or reorder_item()'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger items_guard_status
before update of is_checked, checked_by, checked_at on needcart.items
for each row execute function needcart.guard_item_status();

-- ============================================================================
-- 5. Purchase history
-- ============================================================================

create table needcart.item_purchases (
  id uuid primary key default gen_random_uuid(),
  -- Keep financial history even if the item is hard-deleted later.
  item_id uuid references needcart.items(id) on delete set null,
  group_id uuid not null references needcart.groups(id) on delete cascade,
  category_id uuid references needcart.categories(id) on delete set null,
  -- Snapshots make history independent from later renames/deletes.
  item_name text not null,
  category_name text,
  quantity text not null
    check (char_length(btrim(quantity)) between 1 and 40),
  price_cents integer
    check (price_cents is null or price_cents >= 0),
  ordered_by uuid references needcart.profiles(id) on delete set null,
  ordered_by_name text,
  purchased_by uuid references needcart.profiles(id) on delete set null,
  purchased_by_name text,
  ordered_at timestamptz not null,
  purchased_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index item_purchases_item_idx
  on needcart.item_purchases (item_id, purchased_at desc);

create index item_purchases_group_idx
  on needcart.item_purchases (group_id, purchased_at desc);

-- Keep every purchase from the last month, plus at least the five most recent
-- snapshots per item. Older rows beyond those five are pruned on insert.
create or replace function needcart.prune_item_purchases()
returns trigger
language plpgsql
security definer
set search_path = needcart
as $$
begin
  if new.item_id is not null then
    delete from needcart.item_purchases p
    where p.item_id = new.item_id
      and p.purchased_at < now() - interval '1 month'
      and p.id not in (
        select q.id
        from needcart.item_purchases q
        where q.item_id = new.item_id
        order by q.purchased_at desc, q.created_at desc, q.id desc
        limit 5
      );
  end if;

  return new;
end;
$$;

create trigger item_purchases_retention
after insert on needcart.item_purchases
for each row
execute function needcart.prune_item_purchases();

-- ============================================================================
-- 6. Permission helpers (SECURITY DEFINER to avoid recursive RLS)
-- ============================================================================

create or replace function needcart.is_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = needcart
as $$
  select exists (
    select 1
    from needcart.group_members
    where group_id = p_group_id
      and user_id = auth.uid()
  );
$$;

create or replace function needcart.is_group_admin(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = needcart
as $$
  select exists (
    select 1
    from needcart.group_members
    where group_id = p_group_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;

create or replace function needcart.is_group_owner(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = needcart
as $$
  select exists (
    select 1
    from needcart.groups
    where id = p_group_id
      and owner_id = auth.uid()
  );
$$;

create or replace function needcart.shares_group_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = needcart
as $$
  select exists (
    select 1
    from needcart.group_members me
    join needcart.group_members them
      on them.group_id = me.group_id
    where me.user_id = auth.uid()
      and them.user_id = p_user_id
  );
$$;

-- ============================================================================
-- 7. RPCs
-- ============================================================================

-- Creates a group, the owner membership and default categories atomically.
-- The client passes localized category names via p_categories; English is the
-- fallback so the database never contains untranslated server-side data.
create or replace function needcart.create_group(
  p_name text,
  p_description text default null,
  p_currency text default 'USD',
  p_budget_cents integer default null,
  p_budget_period text default 'none',
  p_timezone text default 'UTC',
  p_categories jsonb default null
)
returns needcart.groups
language plpgsql
security definer
set search_path = needcart
as $$
declare
  v_group needcart.groups;
  v_name text := btrim(coalesce(p_name, ''));
  v_description text := nullif(btrim(coalesce(p_description, '')), '');
  v_currency text := upper(coalesce(p_currency, 'USD'));
  v_period text := coalesce(p_budget_period, 'none');
  v_timezone text := coalesce(p_timezone, 'UTC');
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if char_length(v_name) not between 1 and 80 then
    raise exception 'Group name must be 1..80 characters'
      using errcode = '22023';
  end if;

  if p_description is not null and char_length(p_description) > 500 then
    raise exception 'Description is too long' using errcode = '22023';
  end if;

  if v_currency !~ '^[A-Z]{3}$' then
    raise exception 'Currency must be a 3-letter ISO code'
      using errcode = '22023';
  end if;

  if p_budget_cents is not null and p_budget_cents < 0 then
    raise exception 'Budget cannot be negative' using errcode = '22023';
  end if;

  if v_period not in ('none', 'week', 'month') then
    raise exception 'Invalid budget period' using errcode = '22023';
  end if;

  if not exists (
    select 1 from pg_timezone_names where name = v_timezone
  ) then
    raise exception 'Invalid timezone' using errcode = '22023';
  end if;

  insert into needcart.groups (
    name, description, owner_id, currency,
    budget_cents, budget_period, timezone
  )
  values (
    v_name, v_description, auth.uid(), v_currency,
    p_budget_cents, v_period, v_timezone
  )
  returning * into v_group;

  insert into needcart.group_members (group_id, user_id, role)
  values (v_group.id, auth.uid(), 'owner');

  if p_categories is not null and jsonb_typeof(p_categories) <> 'array' then
    raise exception 'p_categories must be a JSON array'
      using errcode = '22023';
  end if;

  if p_categories is not null and jsonb_array_length(p_categories) > 0 then
    if exists (
      select 1
      from jsonb_array_elements(p_categories) as item
      where btrim(coalesce(item->>'name', '')) = ''
    ) then
      raise exception 'Category name cannot be empty'
        using errcode = '22023';
    end if;

    insert into needcart.categories (group_id, name, color, icon, sort_order)
    select
      v_group.id,
      btrim(item->>'name'),
      coalesce(nullif(item->>'color', ''), '#F5B301'),
      coalesce(nullif(item->>'icon', ''), 'tag'),
      coalesce((item->>'sort_order')::int, (ord - 1)::int)
    from jsonb_array_elements(p_categories) with ordinality as t(item, ord);
  else
    insert into needcart.categories (group_id, name, color, icon, sort_order)
    values
      (v_group.id, 'Groceries', '#F5B301', 'shopping-basket', 0),
      (v_group.id, 'Home', '#4CAF50', 'house', 1),
      (v_group.id, 'Pharmacy', '#2196F3', 'pill', 2),
      (v_group.id, 'Other', '#9E9E9E', 'tag', 3);
  end if;

  return v_group;
end;
$$;

create or replace function needcart.join_group_by_code(p_code text)
returns uuid
language plpgsql
security definer
set search_path = needcart
as $$
declare
  v_group_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if p_code is null or char_length(btrim(p_code)) < 4 then
    raise exception 'Invalid invite code' using errcode = '22023';
  end if;

  select id into v_group_id
  from needcart.groups
  where invite_code = upper(btrim(p_code));

  if v_group_id is null then
    raise exception 'Invalid invite code' using errcode = 'P0002';
  end if;

  insert into needcart.group_members (group_id, user_id, role)
  values (v_group_id, auth.uid(), 'member')
  on conflict (group_id, user_id) do nothing;

  return v_group_id;
end;
$$;

create or replace function needcart.leave_group(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = needcart
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if exists (
    select 1
    from needcart.groups
    where id = p_group_id
      and owner_id = auth.uid()
  ) then
    raise exception
      'Owner cannot leave the group; delete the group or transfer ownership first'
      using errcode = '42501';
  end if;

  delete from needcart.group_members
  where group_id = p_group_id
    and user_id = auth.uid();
end;
$$;

create or replace function needcart.rotate_invite_code(p_group_id uuid)
returns text
language plpgsql
security definer
set search_path = needcart
as $$
declare
  v_code text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if not needcart.is_group_admin(p_group_id) then
    raise exception 'Only owner or admin can rotate the invite code'
      using errcode = '42501';
  end if;

  update needcart.groups
  set invite_code = needcart.generate_invite_code()
  where id = p_group_id
  returning invite_code into v_code;

  if v_code is null then
    raise exception 'Group not found' using errcode = 'P0002';
  end if;

  return v_code;
end;
$$;

-- Quantity is free text; the leading number is the multiplier for money math.
create or replace function needcart.quantity_multiplier(p_quantity text)
returns numeric
language sql
immutable
set search_path = needcart
as $$
  select case
    when v.m is null or v.m <= 0 then 1::numeric
    else v.m
  end
  from (
    select nullif(
      replace(
        (regexp_match(
          btrim(coalesce(p_quantity, '')),
          '^([0-9]+(?:[.,][0-9]+)?)'
        ))[1],
        ',',
        '.'
      ),
      ''
    )::numeric as m
  ) v;
$$;

-- Atomic purchase:
--   1. locks the item,
--   2. checks group membership,
--   3. inserts an immutable history snapshot with the line total,
--   4. keeps the unit price on the item and marks it checked.
-- Idempotent: a second call for an already checked item returns it unchanged.
create or replace function needcart.purchase_item(
  p_item_id uuid,
  p_price_cents integer default null,
  p_quantity text default null
)
returns needcart.items
language plpgsql
security definer
set search_path = needcart
as $$
declare
  v_item needcart.items;
  v_user uuid := auth.uid();
  v_user_name text;
  v_ordered_by_name text;
  v_category_name text;
  v_quantity text;
  v_unit_price_cents integer;
  v_total_price_cents integer;
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if p_price_cents is not null and p_price_cents < 0 then
    raise exception 'Price cannot be negative' using errcode = '22023';
  end if;

  if p_quantity is not null
     and char_length(btrim(p_quantity)) not between 1 and 40
  then
    raise exception 'Quantity must be 1..40 characters'
      using errcode = '22023';
  end if;

  select * into v_item
  from needcart.items
  where id = p_item_id
  for update;

  if not found then
    raise exception 'Item not found' using errcode = 'P0002';
  end if;

  if v_item.deleted_at is not null then
    raise exception 'Item not found' using errcode = 'P0002';
  end if;

  if not needcart.is_group_member(v_item.group_id) then
    raise exception 'Not a group member' using errcode = '42501';
  end if;

  if v_item.is_checked then
    return v_item;
  end if;

  select display_name into v_user_name
  from needcart.profiles
  where id = v_user;

  select display_name into v_ordered_by_name
  from needcart.profiles
  where id = v_item.created_by;

  select name into v_category_name
  from needcart.categories
  where id = v_item.category_id;

  v_quantity := coalesce(nullif(btrim(p_quantity), ''), v_item.quantity);
  v_unit_price_cents := coalesce(p_price_cents, v_item.price_cents);
  v_total_price_cents := case
    when v_unit_price_cents is null then null
    else round(
      v_unit_price_cents * needcart.quantity_multiplier(v_quantity)
    )::integer
  end;

  insert into needcart.item_purchases (
    item_id,
    group_id,
    category_id,
    item_name,
    category_name,
    quantity,
    price_cents,
    ordered_by,
    ordered_by_name,
    purchased_by,
    purchased_by_name,
    ordered_at,
    purchased_at
  )
  values (
    v_item.id,
    v_item.group_id,
    v_item.category_id,
    v_item.name,
    v_category_name,
    v_quantity,
    v_total_price_cents,
    v_item.created_by,
    v_ordered_by_name,
    v_user,
    v_user_name,
    v_item.created_at,
    now()
  );

  -- Transaction-local flag consumed by guard_item_status().
  perform set_config('bfm.item_status_change', '1', true);

  update needcart.items
  set is_checked = true,
      checked_by = v_user,
      checked_at = now(),
      quantity = v_quantity,
      price_cents = v_unit_price_cents
  where id = v_item.id
  returning * into v_item;

  return v_item;
end;
$$;

-- "Order again": uncheck the item, reset the order metadata and keep history.
create or replace function needcart.reorder_item(
  p_item_id uuid,
  p_quantity text,
  p_price_cents integer default null
)
returns needcart.items
language plpgsql
security definer
set search_path = needcart
as $$
declare
  v_item needcart.items;
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if p_quantity is null
     or char_length(btrim(p_quantity)) not between 1 and 40
  then
    raise exception 'Quantity must be 1..40 characters'
      using errcode = '22023';
  end if;

  if p_price_cents is not null and p_price_cents < 0 then
    raise exception 'Price cannot be negative' using errcode = '22023';
  end if;

  select * into v_item
  from needcart.items
  where id = p_item_id
  for update;

  if not found then
    raise exception 'Item not found' using errcode = 'P0002';
  end if;

  if v_item.deleted_at is not null then
    raise exception 'Item not found' using errcode = 'P0002';
  end if;

  if not needcart.is_group_member(v_item.group_id) then
    raise exception 'Not a group member' using errcode = '42501';
  end if;

  perform set_config('bfm.item_status_change', '1', true);

  update needcart.items
  set is_checked = false,
      checked_by = null,
      checked_at = null,
      quantity = btrim(p_quantity),
      price_cents = coalesce(p_price_cents, price_cents),
      created_by = v_user,
      created_at = now()
  where id = v_item.id
  returning * into v_item;

  return v_item;
end;
$$;

-- ============================================================================
-- 8. Group overview / budget summary
-- ============================================================================

-- security_invoker makes the view respect the caller's RLS policies on the
-- underlying tables. Rows of groups the caller cannot see are filtered out.
create or replace view needcart.group_overview
with (security_invoker = true)
as
select
  g.id,
  g.name,
  g.description,
  g.owner_id,
  g.currency,
  g.budget_cents,
  g.budget_period,
  g.timezone,
  g.created_at,
  g.updated_at,
  (
    select count(*)::int
    from needcart.group_members gm
    where gm.group_id = g.id
  ) as member_count,
  (
    select count(*)::int
    from needcart.items i
    where i.group_id = g.id
      and i.deleted_at is null
      and not i.is_checked
  ) as active_items_count,
  coalesce((
    select sum(
      round(i.price_cents * needcart.quantity_multiplier(i.quantity))
    )::bigint
    from needcart.items i
    where i.group_id = g.id
      and i.deleted_at is null
      and not i.is_checked
  ), 0::bigint)::bigint as planned_cents,
  coalesce((
    select sum(p.price_cents)
    from needcart.item_purchases p
    where p.group_id = g.id
      and p.purchased_at >= needcart.budget_period_start(
        g.budget_period,
        g.timezone
      )
  ), 0::bigint)::bigint as spent_cents,
  case
    when g.budget_period = 'none' then null
    else needcart.budget_period_start(g.budget_period, g.timezone)
  end as period_start
from needcart.groups g;

-- ============================================================================
-- 9. Row Level Security
-- ============================================================================

alter table needcart.profiles enable row level security;
alter table needcart.groups enable row level security;
alter table needcart.group_members enable row level security;
alter table needcart.categories enable row level security;
alter table needcart.items enable row level security;
alter table needcart.item_purchases enable row level security;

-- ---------- profiles ----------

create policy profiles_select
on needcart.profiles
for select
to authenticated
using (
  id = auth.uid()
  or needcart.shares_group_with(id)
);

create policy profiles_insert
on needcart.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy profiles_update
on needcart.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- ---------- groups ----------

create policy groups_select
on needcart.groups
for select
to authenticated
using (needcart.is_group_member(id));

-- No INSERT policy: groups are created through create_group() only.

create policy groups_update
on needcart.groups
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy groups_delete
on needcart.groups
for delete
to authenticated
using (owner_id = auth.uid());

-- ---------- group_members ----------

create policy group_members_select
on needcart.group_members
for select
to authenticated
using (needcart.is_group_member(group_id));

-- No INSERT policy: joining happens through join_group_by_code().

create policy group_members_update
on needcart.group_members
for update
to authenticated
using (needcart.is_group_owner(group_id))
with check (
  needcart.is_group_owner(group_id)
  and user_id <> auth.uid()
  and role in ('admin', 'member')
);

create policy group_members_delete
on needcart.group_members
for delete
to authenticated
using (
  role <> 'owner'
  and (
    user_id = auth.uid()
    or needcart.is_group_owner(group_id)
    or (role = 'member' and needcart.is_group_admin(group_id))
  )
);

-- ---------- categories ----------

create policy categories_select
on needcart.categories
for select
to authenticated
using (needcart.is_group_member(group_id));

create policy categories_insert
on needcart.categories
for insert
to authenticated
with check (needcart.is_group_admin(group_id));

create policy categories_update
on needcart.categories
for update
to authenticated
using (needcart.is_group_admin(group_id))
with check (needcart.is_group_admin(group_id));

create policy categories_delete
on needcart.categories
for delete
to authenticated
using (needcart.is_group_admin(group_id));

-- ---------- items ----------

create policy items_select
on needcart.items
for select
to authenticated
using (needcart.is_group_member(group_id));

create policy items_insert
on needcart.items
for insert
to authenticated
with check (
  needcart.is_group_member(group_id)
  and created_by = auth.uid()
  and is_checked = false
  and checked_by is null
  and checked_at is null
  and deleted_at is null
);

create policy items_update
on needcart.items
for update
to authenticated
using (
  needcart.is_group_member(group_id)
  and (
    needcart.is_group_admin(group_id)
    or (created_by = auth.uid() and is_checked = false)
  )
)
with check (
  needcart.is_group_member(group_id)
  and (
    needcart.is_group_admin(group_id)
    or (created_by = auth.uid() and is_checked = false)
  )
);

-- No DELETE policy: the app soft-deletes items by setting deleted_at.
-- Hard deletes are reserved for service-role maintenance.

-- ---------- item_purchases ----------

create policy item_purchases_select
on needcart.item_purchases
for select
to authenticated
using (needcart.is_group_member(group_id));

-- No INSERT/UPDATE/DELETE policies: history is written by purchase_item().

-- ============================================================================
-- 10. Grants (least privilege)
-- ============================================================================

revoke all on schema needcart from public, anon, authenticated;
revoke all on all tables in schema needcart from public, anon, authenticated;
revoke all on all sequences in schema needcart from public, anon, authenticated;
revoke all on all functions in schema needcart from public, anon, authenticated;

grant usage on schema needcart to anon, authenticated, service_role;

-- Tables
grant select, insert, update on needcart.profiles to authenticated;
grant select, update, delete on needcart.groups to authenticated;
grant select, update, delete on needcart.group_members to authenticated;
grant select, insert, update, delete on needcart.categories to authenticated;
grant select, insert, update on needcart.items to authenticated;
grant select on needcart.item_purchases to authenticated;

-- View
revoke all on needcart.group_overview from anon, authenticated;
grant select on needcart.group_overview to authenticated;

-- Permission helpers used inside RLS policies and RPCs
grant execute on function needcart.is_group_member(uuid) to authenticated;
grant execute on function needcart.is_group_admin(uuid) to authenticated;
grant execute on function needcart.is_group_owner(uuid) to authenticated;
grant execute on function needcart.shares_group_with(uuid) to authenticated;
grant execute on function needcart.budget_period_start(text, text) to authenticated;

-- RPCs
grant execute on function needcart.create_group(
  text, text, text, integer, text, text, jsonb
) to authenticated;

grant execute on function needcart.join_group_by_code(text) to authenticated;
grant execute on function needcart.leave_group(uuid) to authenticated;
grant execute on function needcart.rotate_invite_code(uuid) to authenticated;

grant execute on function needcart.purchase_item(
  uuid, integer, text
) to authenticated;

grant execute on function needcart.reorder_item(
  uuid, text, integer
) to authenticated;

-- Trigger and default functions execute as the role that changes the row.
-- These grants are required because EXECUTE was revoked from PUBLIC above.
grant execute on function needcart.set_updated_at() to authenticated;
grant execute on function needcart.generate_invite_code() to authenticated;
grant execute on function needcart.validate_group_timezone() to authenticated;
grant execute on function needcart.prevent_group_owner_change() to authenticated;
grant execute on function needcart.prevent_group_member_identity_change() to authenticated;
grant execute on function needcart.prevent_category_group_change() to authenticated;
grant execute on function needcart.ensure_item_category_group() to authenticated;
grant execute on function needcart.prevent_item_group_change() to authenticated;
grant execute on function needcart.guard_item_status() to authenticated;

-- Supabase Auth inserts auth.users rows as supabase_auth_admin; the trigger
-- needs explicit EXECUTE and schema usage after the revoke above.
grant usage on schema needcart to supabase_auth_admin;
grant execute on function needcart.handle_new_user() to supabase_auth_admin;

-- service_role is used only by Edge Functions. It still needs table grants
-- even though it bypasses RLS.
grant all on all tables in schema needcart to service_role;
grant all on all sequences in schema needcart to service_role;
grant all on all functions in schema needcart to service_role;
grant select on needcart.group_overview to service_role;

-- PostgREST's internal roles need schema access when the schema is exposed.
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

-- ============================================================================
-- 11. Realtime publication
-- ============================================================================
--
-- Idempotent: safe if the project already added a table to the publication.
-- We intentionally subscribe to INSERT/UPDATE, not DELETE. Deletions of
-- groups/members/categories are handled by refetch-on-focus.

do $$
declare
  v_table text;
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    foreach v_table in array array[
      'groups', 'group_members', 'categories', 'items', 'item_purchases'
    ] loop
      if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'needcart'
          and tablename = v_table
      ) then
        execute format(
          'alter publication supabase_realtime add table needcart.%I',
          v_table
        );
      end if;
    end loop;
  end if;
end;
$$;

-- ============================================================================
-- 12. Storage: avatars
-- ============================================================================

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'needcart-avatars',
  'needcart-avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Storage policies live outside the needcart schema and are not rolled back
-- with it. Drop leftovers from a partial install before recreating them.
drop policy if exists "needcart_avatars_public_read" on storage.objects;
drop policy if exists "needcart_avatars_insert_own" on storage.objects;
drop policy if exists "needcart_avatars_update_own" on storage.objects;
drop policy if exists "needcart_avatars_delete_own" on storage.objects;

create policy "needcart_avatars_public_read"
on storage.objects
for select
using (bucket_id = 'needcart-avatars');

create policy "needcart_avatars_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'needcart-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "needcart_avatars_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'needcart-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'needcart-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "needcart_avatars_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'needcart-avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);
