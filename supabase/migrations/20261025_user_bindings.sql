-- 1. Add public_id to profiles
alter table public.profiles add column if not exists public_id text unique;
create index if not exists idx_profiles_public_id on public.profiles(public_id);

-- 2. Create user_bindings table for pre-registration and account binding
create table if not exists public.user_bindings (
    id uuid default gen_random_uuid() primary key,
    public_id text unique not null,
    auth_user_id uuid references auth.users(id) on delete set null,
    role text default 'student' not null,
    full_name text default 'Гость платформы',
    phone text,
    email text,
    is_registered boolean default false not null,
    balance_lessons int default 0 not null,
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

create index if not exists idx_user_bindings_public_id on public.user_bindings(public_id);
create index if not exists idx_user_bindings_auth_user_id on public.user_bindings(auth_user_id);

-- Enable RLS
alter table public.user_bindings enable row level security;

-- Policies for user_bindings: allow anonymous read, insert and update
drop policy if exists "Allow public select user_bindings" on public.user_bindings;
create policy "Allow public select user_bindings" on public.user_bindings
    for select using (true);

drop policy if exists "Allow public insert user_bindings" on public.user_bindings;
create policy "Allow public insert user_bindings" on public.user_bindings
    for insert with check (true);

drop policy if exists "Allow public update user_bindings" on public.user_bindings;
create policy "Allow public update user_bindings" on public.user_bindings
    for update using (true);

-- Update trigger handle_new_user to capture public_id
create or replace function public.handle_new_user()
returns trigger as $$
declare
    v_public_id text;
begin
    v_public_id := coalesce(new.raw_user_meta_data->>'public_id', 'id' || floor(100000 + random() * 900000)::text);

    insert into public.profiles (id, full_name, role, phone, balance_lessons, public_id)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'full_name', 'Новый ученик'),
        coalesce((new.raw_user_meta_data->>'role')::user_role, 'student'),
        new.raw_user_meta_data->>'phone',
        coalesce((new.raw_user_meta_data->>'balance_lessons')::int, 0),
        v_public_id
    )
    on conflict (id) do update set
        public_id = coalesce(profiles.public_id, excluded.public_id);

    -- Also link or upsert in user_bindings
    insert into public.user_bindings (public_id, auth_user_id, role, full_name, phone, email, is_registered)
    values (
        v_public_id,
        new.id,
        coalesce(new.raw_user_meta_data->>'role', 'student'),
        coalesce(new.raw_user_meta_data->>'full_name', 'Новый ученик'),
        new.raw_user_meta_data->>'phone',
        new.email,
        true
    )
    on conflict (public_id) do update set
        auth_user_id = new.id,
        is_registered = true,
        email = coalesce(excluded.email, user_bindings.email),
        full_name = coalesce(excluded.full_name, user_bindings.full_name),
        updated_at = now();

    return new;
end;
$$ language plpgsql security definer;
