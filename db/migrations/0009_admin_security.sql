-- Admin sign-in by email + password (separate from Google), with lockout, sessions, 2FA and an audit trail.

create table if not exists app.admin_credentials (
  user_id text primary key,
  email text not null unique,             -- stored lower case
  password_hash text not null,            -- scrypt, see src/server/admin-auth/crypto.ts
  must_change boolean not null default true,
  totp_secret text,                       -- base32, set once 2FA is confirmed
  totp_pending text,                      -- base32, while 2FA is being set up
  totp_last_step bigint not null default 0, -- stops a code being used twice
  password_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists app.admin_sessions (
  token_hash text primary key,            -- sha256 of the cookie value; the value itself is never stored
  user_id text not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ip text,
  user_agent text
);
create index if not exists admin_sessions_user on app.admin_sessions (user_id);

create table if not exists app.auth_failures (
  id bigserial primary key,
  scope text not null,                    -- 'email' or 'ip'
  key text not null,
  at timestamptz not null default now()
);
create index if not exists auth_failures_key on app.auth_failures (scope, key, at);

create table if not exists app.auth_locks (
  scope text not null,
  key text not null,
  until timestamptz not null,
  strikes int not null default 1,
  primary key (scope, key)
);

create table if not exists app.admin_audit (
  id bigserial primary key,
  at timestamptz not null default now(),
  user_id text,
  email text,
  action text not null,
  ip text,
  user_agent text,
  detail jsonb not null default '{}'::jsonb
);
create index if not exists admin_audit_at on app.admin_audit (at desc);
