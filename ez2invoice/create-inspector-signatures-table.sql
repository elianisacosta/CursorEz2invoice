-- Create table for storing inspector signatures
create table if not exists inspector_signatures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  signature_data text not null,
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table inspector_signatures enable row level security;

-- RLS Policies
create policy "Users can manage own signature" on inspector_signatures
  for select using (auth.uid() = user_id);

create policy "Users can upsert own signature" on inspector_signatures
  for insert with check (auth.uid() = user_id);

create policy "Users can update own signature" on inspector_signatures
  for update using (auth.uid() = user_id);

