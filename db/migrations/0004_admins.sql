-- People a super admin has made admins. Super admins themselves come from SUPER_ADMIN_USER_IDS (env), never from this table.
create table if not exists app.admins (
  user_id text primary key,
  email text not null,
  name text not null,
  added_by text not null,
  created_at timestamptz not null default now()
);
