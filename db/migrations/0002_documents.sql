-- App tables, one per aggregate. Each row keeps the engine's own object
-- (src/lib/types.ts) in `doc`, plus the few columns we filter or join on.
-- Money stays integer kobo inside the docs.
-- The relational tables from 0001 (schema public) are unused and empty; they can be dropped later.

create schema if not exists app;

create table app.artisans (
  id text primary key,
  owner_id text not null unique,
  trade text not null,
  status text not null,
  area_ids text[] not null,
  doc jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index artisans_trade_idx on app.artisans (trade);
create index artisans_areas_idx on app.artisans using gin (area_ids);

create table app.bookings (
  id text primary key,
  customer_id text not null,
  artisan_id text not null references app.artisans (id),
  status text not null,
  doc jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index bookings_customer_idx on app.bookings (customer_id);
create index bookings_artisan_idx on app.bookings (artisan_id);

create table app.payments (
  id text primary key,
  booking_id text not null references app.bookings (id),
  status text not null,
  provider text not null,
  provider_ref text unique,
  doc jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_booking_idx on app.payments (booking_id);

create table app.reviews (
  id text primary key,
  booking_id text not null unique references app.bookings (id),
  artisan_id text not null references app.artisans (id),
  doc jsonb not null,
  created_at timestamptz not null default now()
);
create index reviews_artisan_idx on app.reviews (artisan_id);

create table app.reports (
  id text primary key,
  doc jsonb not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);
