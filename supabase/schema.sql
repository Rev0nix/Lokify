create table if not exists public.issues (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  description text not null check (char_length(description) between 1 and 2000),
  category text not null check (category in ('Pothole', 'Streetlight', 'Garbage', 'Water')),
  latitude double precision,
  longitude double precision,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.issues enable row level security;

drop policy if exists "Authenticated users can view issues" on public.issues;
create policy "Authenticated users can view issues"
  on public.issues for select to authenticated
  using (true);

drop policy if exists "Users can report issues as themselves" on public.issues;
create policy "Users can report issues as themselves"
  on public.issues for insert to authenticated
  with check (auth.uid() = user_id);

grant select, insert on public.issues to authenticated;