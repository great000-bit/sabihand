-- Autopilot (the admin bot): the team's rules, one row, and a log of everything it did or left for a person.
create table if not exists app.autopilot (
  id int primary key default 1 check (id = 1),
  rules jsonb not null,
  updated_by text,
  updated_at timestamptz not null default now()
);
create table if not exists app.autopilot_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  kind text not null,      -- payout | verify | run | settings
  target text,             -- payment or artisan id
  outcome text not null,   -- done | sent | failed | info
  detail text not null
);
create index if not exists autopilot_log_at_idx on app.autopilot_log (at desc);
