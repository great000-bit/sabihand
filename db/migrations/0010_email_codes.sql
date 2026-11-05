-- Email check codes for accounts made with email and password. One live code per account; only its hash is kept.
create table if not exists app.email_codes (
  user_id text primary key,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  sent_at timestamptz not null default now()
);
