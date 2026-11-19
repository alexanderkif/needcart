-- Purchase history retention:
--   * keep every purchase from the last month without a limit;
--   * always keep the five most recent purchases per item.
-- Older rows beyond those five are pruned after each insert and once during
-- this migration. The current weekly/monthly budget window is covered by the
-- one-month retention window.

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

drop trigger if exists item_purchases_retention on needcart.item_purchases;

create trigger item_purchases_retention
after insert on needcart.item_purchases
for each row
execute function needcart.prune_item_purchases();

-- One-time cleanup for existing data. The same rule is applied: keep the
-- recent month in full and top up to five latest purchases for older items.
delete from needcart.item_purchases p
where p.item_id is not null
  and p.purchased_at < now() - interval '1 month'
  and p.id not in (
    select q.id
    from needcart.item_purchases q
    where q.item_id = p.item_id
    order by q.purchased_at desc, q.created_at desc, q.id desc
    limit 5
  );
