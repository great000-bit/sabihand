-- Live chat between the customer and the artisan on a booking.
-- seq is the cursor clients poll with; (sender_id, client_id) makes a retried send harmless.
create table if not exists app.messages (
  id text primary key,
  seq bigserial not null unique,
  booking_id text not null references app.bookings (id),
  sender_id text not null,
  body text not null,
  client_id text,
  created_at timestamptz not null default now(),
  unique (sender_id, client_id)
);
create index if not exists messages_booking_seq_idx on app.messages (booking_id, seq);

-- How far each person has read in each chat. Drives "Seen" and unread counts.
create table if not exists app.chat_reads (
  booking_id text not null references app.bookings (id),
  user_id text not null,
  last_seq bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (booking_id, user_id)
);
