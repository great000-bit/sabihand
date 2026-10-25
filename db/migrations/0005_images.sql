-- Profile and work photos. Resized in the browser to a small JPEG, kept as base64 text so no extra storage service is needed.
create table if not exists app.images (
  id text primary key,
  owner_id text not null,
  mime text not null,
  size integer not null,
  data text not null,
  created_at timestamptz not null default now()
);
create index if not exists images_owner_idx on app.images (owner_id);
