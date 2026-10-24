-- Optimistic locking: every write names the version it read, and loses if someone else wrote first.
alter table app.artisans add column if not exists version integer not null default 0;
alter table app.bookings add column if not exists version integer not null default 0;
alter table app.payments add column if not exists version integer not null default 0;
alter table app.reviews add column if not exists version integer not null default 0;
alter table app.reports add column if not exists version integer not null default 0;
