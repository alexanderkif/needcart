-- ============================================================================
-- NeedCart local seed data.
--
-- Intended for `supabase db reset` in a local environment only.
-- All application rows live in the `needcart` schema; `public` is untouched.
-- Sign in with one of the seeded emails through Inbucket (http://localhost:54324)
-- or generate a magic link for them. Passwords are filled for convenience but
-- the app itself never uses passwords.
-- ============================================================================

-- Two confirmed users. The auth trigger creates matching profiles.
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-4111-8111-111111111111',
    'authenticated',
    'authenticated',
    'alice@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Alice"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-4222-8222-222222222222',
    'authenticated',
    'authenticated',
    'bob@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Bob"}',
    now(),
    now()
  )
on conflict (id) do nothing;

insert into auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
values
  (
    'alice@example.com',
    '11111111-1111-4111-8111-111111111111',
    '{"sub":"11111111-1111-4111-8111-111111111111","email":"alice@example.com"}',
    'email',
    now(),
    now(),
    now()
  ),
  (
    'bob@example.com',
    '22222222-2222-4222-8222-222222222222',
    '{"sub":"22222222-2222-4222-8222-222222222222","email":"bob@example.com"}',
    'email',
    now(),
    now(),
    now()
  )
on conflict (provider_id, provider) do nothing;

update needcart.profiles
set display_name = 'Alice'
where id = '11111111-1111-4111-8111-111111111111';

update needcart.profiles
set display_name = 'Bob'
where id = '22222222-2222-4222-8222-222222222222';

insert into needcart.groups (
  id,
  name,
  description,
  owner_id,
  invite_code,
  currency,
  budget_cents,
  budget_period,
  timezone
)
values (
  '33333333-3333-4333-8333-333333333333',
  'Home',
  'Weekly groceries for the flat',
  '11111111-1111-4111-8111-111111111111',
  'ABCD2345EFGH',
  'EUR',
  5000,
  'week',
  'Europe/Berlin'
)
on conflict (id) do nothing;

insert into needcart.group_members (group_id, user_id, role)
values
  (
    '33333333-3333-4333-8333-333333333333',
    '11111111-1111-4111-8111-111111111111',
    'owner'
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    '22222222-2222-4222-8222-222222222222',
    'member'
  )
on conflict (group_id, user_id) do nothing;

insert into needcart.categories (id, group_id, name, color, icon, sort_order)
values
  (
    '44444444-4444-4444-8444-444444444441',
    '33333333-3333-4333-8333-333333333333',
    'Groceries',
    '#F5B301',
    'basket',
    0
  ),
  (
    '44444444-4444-4444-8444-444444444442',
    '33333333-3333-4333-8333-333333333333',
    'Home',
    '#4CAF50',
    'home',
    1
  ),
  (
    '44444444-4444-4444-8444-444444444443',
    '33333333-3333-4333-8333-333333333333',
    'Pharmacy',
    '#2196F3',
    'medkit',
    2
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    '33333333-3333-4333-8333-333333333333',
    'Other',
    '#9E9E9E',
    'pricetag',
    3
  )
on conflict (id) do nothing;

insert into needcart.items (
  id,
  group_id,
  category_id,
  name,
  quantity,
  description,
  price_cents,
  is_checked,
  created_by,
  checked_by,
  checked_at,
  created_at
)
values
  (
    '55555555-5555-4555-8555-555555555551',
    '33333333-3333-4333-8333-333333333333',
    '44444444-4444-4444-8444-444444444441',
    'Milk',
    '2 l',
    'Oat milk if available',
    350,
    true,
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    now() - interval '1 day',
    now() - interval '3 days'
  ),
  (
    '55555555-5555-4555-8555-555555555552',
    '33333333-3333-4333-8333-333333333333',
    '44444444-4444-4444-8444-444444444441',
    'Bread',
    '1 loaf',
    null,
    280,
    false,
    '22222222-2222-4222-8222-222222222222',
    null,
    null,
    now() - interval '2 days'
  ),
  (
    '55555555-5555-4555-8555-555555555553',
    '33333333-3333-4333-8333-333333333333',
    '44444444-4444-4444-8444-444444444442',
    'Dish soap',
    '1 bottle',
    'Lemon',
    220,
    false,
    '11111111-1111-4111-8111-111111111111',
    null,
    null,
    now() - interval '1 day'
  )
on conflict (id) do nothing;

insert into needcart.item_purchases (
  id,
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
  '66666666-6666-4666-8666-666666666661',
  '55555555-5555-4555-8555-555555555551',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444441',
  'Milk',
  'Groceries',
  '2 l',
  349,
  '11111111-1111-4111-8111-111111111111',
  'Alice',
  '22222222-2222-4222-8222-222222222222',
  'Bob',
  now() - interval '3 days',
  now() - interval '1 day'
)
on conflict (id) do nothing;
