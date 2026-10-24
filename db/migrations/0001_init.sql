-- Sabihand schema for Neon Postgres. Money is integer kobo everywhere.
-- Access control lives in server code (src/lib/engine.ts rules plus per-request
-- role checks), not in row level security, because Neon has no built-in auth.users.
-- Sign-in provider is still to be chosen; profiles.auth_id links to it.

create type trade as enum ('plumbing', 'electrical', 'tailoring', 'carpentry');
create type app_role as enum ('customer', 'artisan', 'admin');
create type verification_check as enum ('phone', 'id', 'address', 'guarantor', 'work_sample');
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
  id uuid primary key default gen_random_uuid(),
  auth_id text unique,
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

create index on artisans (trade) where published;
create index on artisan_areas (area_id);
create index on bookings (customer_id);
create index on bookings (artisan_id);

insert into areas (id, city, name) values
  ('lagos-yaba','Lagos','Yaba'),('lagos-akoka','Lagos','Akoka (near UNILAG)'),('lagos-surulere','Lagos','Surulere'),
  ('lagos-ikeja','Lagos','Ikeja'),('lagos-lekki','Lagos','Lekki'),
  ('abuja-wuse','Abuja','Wuse'),('abuja-garki','Abuja','Garki'),('abuja-gwarinpa','Abuja','Gwarinpa'),
  ('abuja-gwagwalada','Abuja','Gwagwalada (near UniAbuja)'),('abuja-kubwa','Abuja','Kubwa'),
  ('ph-gra','Port Harcourt','Old GRA'),('ph-rumuokoro','Port Harcourt','Rumuokoro'),
  ('ph-choba','Port Harcourt','Choba (near UNIPORT)'),('ph-rumuola','Port Harcourt','Rumuola'),
  ('ph-transamadi','Port Harcourt','Trans-Amadi');
