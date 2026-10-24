-- Sabihand MVP schema. NOT applied to any live project yet; the demo app runs on
-- localStorage. Money is integer kobo everywhere. Run in a fresh Supabase project.

create type trade as enum ('plumber', 'electrician', 'tailor', 'carpenter');
create type app_role as enum ('customer', 'artisan', 'admin');
create type verification_check as enum ('phone', 'id', 'address', 'referee', 'work_sample');
create type verification_status as enum ('unverified', 'pending', 'verified', 'rejected');
create type booking_status as enum (
  'pending_response', 'accepted', 'declined', 'awaiting_payment', 'confirmed',
  'in_progress', 'completed', 'cancelled', 'disputed'
);
create type payment_status as enum ('held', 'released', 'refunded');

create table areas (
  id text primary key,
  city text not null check (city in ('Lagos', 'Abuja', 'Port Harcourt')),
  name text not null,
  note text
);

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  role app_role not null default 'customer',
  full_name text not null,
  phone text,
  created_at timestamptz not null default now()
);

create table artisans (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references profiles on delete cascade,
  business_name text not null,
  trade trade not null,
  bio text not null default '',
  availability text not null default '',
  verification_status verification_status not null default 'unverified',
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table artisan_areas (
  artisan_id uuid references artisans on delete cascade,
  area_id text references areas,
  primary key (artisan_id, area_id)
);

create table service_prices (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references artisans on delete cascade,
  label text not null,
  min_kobo bigint not null check (min_kobo >= 0),
  max_kobo bigint not null check (max_kobo >= min_kobo)
);

create table portfolio_items (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references artisans on delete cascade,
  caption text not null,
  image_path text
);

-- A check only appears here once someone on the team actually performed it.
create table verification_checks (
  id uuid primary key default gen_random_uuid(),
  artisan_id uuid not null references artisans on delete cascade,
  kind verification_check not null,
  performed_by uuid references profiles,
  performed_at timestamptz not null default now(),
  note text,
  unique (artisan_id, kind)
);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles,
  artisan_id uuid not null references artisans,
  title text not null,
  details text not null,
  area_id text not null references areas,
  preferred_date date,
  status booking_status not null default 'pending_response',
  quote_kobo bigint check (quote_kobo > 0),
  quote_note text,
  quote_date date,
  artisan_marked_done_at timestamptz,
  created_at timestamptz not null default now()
);

create table booking_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings on delete cascade,
  actor_role app_role not null,
  from_status booking_status,
  to_status booking_status not null,
  note text,
  created_at timestamptz not null default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references bookings,
  amount_kobo bigint not null check (amount_kobo > 0),
  commission_kobo bigint not null check (commission_kobo >= 0),
  provider text not null default 'demo',
  provider_ref text,
  status payment_status not null default 'held',
  created_at timestamptz not null default now(),
  settled_at timestamptz
);

-- One review per completed booking; no seeded or invented ratings.
create table reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references bookings,
  artisan_id uuid not null references artisans,
  customer_id uuid not null references profiles,
  rating int not null check (rating between 1 and 5),
  comment text not null default '',
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles,
  kind text not null check (kind in ('dispute', 'review', 'artisan')),
  booking_id uuid references bookings,
  review_id uuid references reviews,
  reason text not null,
  resolved boolean not null default false,
  resolution text,
  created_at timestamptz not null default now()
);

-- Row level security. Status moves and payments must go through server code
-- (service role) so the booking rules in src/lib/engine.ts are enforced once.
alter table profiles enable row level security;
alter table artisans enable row level security;
alter table artisan_areas enable row level security;
alter table service_prices enable row level security;
alter table portfolio_items enable row level security;
alter table verification_checks enable row level security;
alter table bookings enable row level security;
alter table booking_events enable row level security;
alter table payments enable row level security;
alter table reviews enable row level security;
alter table reports enable row level security;
alter table areas enable row level security;

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create policy areas_read on areas for select using (true);
create policy profiles_self on profiles for select using (id = auth.uid() or is_admin());
create policy profiles_update_self on profiles for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));

create policy artisans_public_read on artisans for select using (published or profile_id = auth.uid() or is_admin());
create policy artisans_owner_write on artisans for all using (profile_id = auth.uid())
  with check (profile_id = auth.uid() and verification_status in ('unverified', 'pending'));

create policy artisan_areas_read on artisan_areas for select using (true);
create policy service_prices_read on service_prices for select using (true);
create policy portfolio_read on portfolio_items for select using (true);
create policy checks_read on verification_checks for select using (true);

create policy bookings_parties on bookings for select using (
  customer_id = auth.uid()
  or artisan_id in (select id from artisans where profile_id = auth.uid())
  or is_admin()
);
create policy bookings_customer_insert on bookings for insert
  with check (customer_id = auth.uid() and status = 'pending_response');

create policy events_parties on booking_events for select using (
  booking_id in (select id from bookings)
);
create policy payments_parties on payments for select using (
  booking_id in (select id from bookings)
);
create policy reviews_public on reviews for select using (not hidden or is_admin());
create policy reports_own on reports for select using (reporter_id = auth.uid() or is_admin());
create policy reports_insert on reports for insert with check (reporter_id = auth.uid());

create index on artisans (trade) where published;
create index on artisan_areas (area_id);
create index on bookings (customer_id);
create index on bookings (artisan_id);
