-- Run this once in Supabase → SQL Editor (project → SQL Editor → New query → paste → Run)

create table if not exists progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table progress enable row level security;

-- each learner can only ever see / write their own row
create policy "select own progress"
  on progress for select
  using (auth.uid() = user_id);

create policy "insert own progress"
  on progress for insert
  with check (auth.uid() = user_id);

create policy "update own progress"
  on progress for update
  using (auth.uid() = user_id);
