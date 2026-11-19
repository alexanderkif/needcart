-- Price semantics: items.price_cents is now the price per unit, not the total
-- for the line. Planned totals multiply it by the leading number in the
-- free-text quantity. Purchase history keeps the final line total.
--
-- Existing rows are intentionally treated as unit prices. Items with quantity
-- "1" keep their previous total; multi-quantity rows now contribute
-- unit_price * quantity.

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

-- Atomic purchase:
--   1. locks the item,
--   2. checks group membership,
--   3. stores the line total in history and the unit price on the item,
--   4. marks the item checked.
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

grant execute on function needcart.purchase_item(uuid, integer, text)
  to authenticated;
