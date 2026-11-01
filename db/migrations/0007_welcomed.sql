-- Who has already had the welcome email. Accounts that existed before the welcome email was added count as welcomed,
-- so only people who sign up from now on get it.
create table if not exists app.welcomed (
  user_id text primary key,
  sent_at timestamptz not null default now()
);
insert into app.welcomed (user_id) select id::text from neon_auth."user" on conflict do nothing;
