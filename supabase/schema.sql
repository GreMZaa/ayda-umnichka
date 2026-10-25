-- ============================================================
-- AYDA-UMNICHKA PLATFORM: FULL SUPABASE DATABASE SCHEMA
-- ============================================================

-- 1. Custom Types / Enums
do $$ begin
    create type user_role as enum ('student', 'teacher', 'admin');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type lesson_status as enum ('pending', 'active', 'completed', 'cancelled');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type hw_status as enum ('assigned', 'submitted', 'reviewed');
exception
    when duplicate_object then null;
end $$;

-- 2. Profiles Table
create table if not exists public.profiles (
    id uuid references auth.users on delete cascade primary key,
    role user_role default 'student' not null,
    full_name text not null,
    phone text,
    avatar_url text,
    balance_lessons int default 0 not null,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- Auto-create profile on signup trigger
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, full_name, role, phone, balance_lessons)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'full_name', 'Новый ученик'),
        coalesce((new.raw_user_meta_data->>'role')::user_role, 'student'),
        new.raw_user_meta_data->>'phone',
        coalesce((new.raw_user_meta_data->>'balance_lessons')::int, 0)
    )
    on conflict (id) do nothing;
    return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- 3. Teacher-Student Pairings
create table if not exists public.teacher_students (
    id uuid default gen_random_uuid() primary key,
    teacher_id uuid references public.profiles(id) on delete cascade not null,
    student_id uuid references public.profiles(id) on delete cascade not null,
    notes text,
    created_at timestamptz default now() not null,
    unique(teacher_id, student_id)
);

-- 4. Conversations (Messenger Dialogs)
create table if not exists public.conversations (
    id uuid default gen_random_uuid() primary key,
    student_id uuid references public.profiles(id) on delete cascade not null,
    teacher_id uuid references public.profiles(id) on delete cascade not null,
    last_message_at timestamptz default now() not null,
    created_at timestamptz default now() not null,
    unique(student_id, teacher_id)
);

-- 5. Chat Messages
create table if not exists public.messages (
    id uuid default gen_random_uuid() primary key,
    conversation_id uuid references public.conversations(id) on delete cascade not null,
    sender_id uuid references public.profiles(id) on delete cascade not null,
    text text,
    file_url text,
    file_type text, -- 'image', 'audio_voice', 'document'
    is_read boolean default false not null,
    created_at timestamptz default now() not null
);

-- 6. Video Lessons
create table if not exists public.lessons (
    id uuid default gen_random_uuid() primary key,
    teacher_id uuid references public.profiles(id) on delete cascade not null,
    student_id uuid references public.profiles(id) on delete cascade not null,
    status lesson_status default 'pending' not null,
    room_token text unique not null,
    started_at timestamptz,
    ended_at timestamptz,
    duration_minutes int default 0,
    whiteboard_snapshot_url text,
    teacher_summary text,
    created_at timestamptz default now() not null
);

-- 7. Homework
create table if not exists public.homework (
    id uuid default gen_random_uuid() primary key,
    lesson_id uuid references public.lessons(id) on delete cascade,
    teacher_id uuid references public.profiles(id) on delete cascade not null,
    student_id uuid references public.profiles(id) on delete cascade not null,
    title text not null,
    task_description text not null,
    task_file_url text,
    student_solution_text text,
    student_solution_file_url text,
    status hw_status default 'assigned' not null,
    teacher_feedback text,
    created_at timestamptz default now() not null,
    updated_at timestamptz default now() not null
);

-- 8. Balance Transactions History
create table if not exists public.lesson_transactions (
    id uuid default gen_random_uuid() primary key,
    student_id uuid references public.profiles(id) on delete cascade not null,
    admin_id uuid references public.profiles(id),
    amount int not null,
    description text not null,
    created_at timestamptz default now() not null
);

-- 9. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.teacher_students enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.lessons enable row level security;
alter table public.homework enable row level security;
alter table public.lesson_transactions enable row level security;

-- Profiles Policies
drop policy if exists "Profiles are viewable by authenticated users" on public.profiles;
create policy "Profiles are viewable by authenticated users"
    on public.profiles for select
    to authenticated
    using (true);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
    on public.profiles for update
    to authenticated
    using (auth.uid() = id);

-- Conversations Policies
drop policy if exists "Users can see conversations they belong to" on public.conversations;
create policy "Users can see conversations they belong to"
    on public.conversations for all
    to authenticated
    using (auth.uid() = student_id or auth.uid() = teacher_id);

-- Messages Policies
drop policy if exists "Users can see messages in their conversations" on public.messages;
create policy "Users can see messages in their conversations"
    on public.messages for select
    to authenticated
    using (
        exists (
            select 1 from public.conversations c
            where c.id = messages.conversation_id
            and (c.student_id = auth.uid() or c.teacher_id = auth.uid())
        )
    );

drop policy if exists "Users can send messages to their conversations" on public.messages;
create policy "Users can send messages to their conversations"
    on public.messages for insert
    to authenticated
    with check (
        auth.uid() = sender_id and
        exists (
            select 1 from public.conversations c
            where c.id = messages.conversation_id
            and (c.student_id = auth.uid() or c.teacher_id = auth.uid())
        )
    );

-- Lessons Policies
drop policy if exists "Users can view their lessons" on public.lessons;
create policy "Users can view their lessons"
    on public.lessons for select
    to authenticated
    using (auth.uid() = student_id or auth.uid() = teacher_id);

drop policy if exists "Teachers can create and manage lessons" on public.lessons;
create policy "Teachers can create and manage lessons"
    on public.lessons for all
    to authenticated
    using (auth.uid() = teacher_id or auth.uid() = student_id);

-- Homework Policies
drop policy if exists "Users can view their homework" on public.homework;
create policy "Users can view their homework"
    on public.homework for select
    to authenticated
    using (auth.uid() = student_id or auth.uid() = teacher_id);

drop policy if exists "Teachers and students can update homework" on public.homework;
create policy "Teachers and students can update homework"
    on public.homework for all
    to authenticated
    using (auth.uid() = student_id or auth.uid() = teacher_id);

-- Lesson Transactions Policies
drop policy if exists "Students can view their transactions" on public.lesson_transactions;
create policy "Students can view their transactions"
    on public.lesson_transactions for select
    to authenticated
    using (auth.uid() = student_id);

-- 10. Enable Realtime Publications
do $$ begin
    alter publication supabase_realtime add table public.messages;
exception
    when others then null;
end $$;

do $$ begin
    alter publication supabase_realtime add table public.lessons;
exception
    when others then null;
end $$;

do $$ begin
    alter publication supabase_realtime add table public.conversations;
exception
    when others then null;
end $$;

do $$ begin
    alter publication supabase_realtime add table public.homework;
exception
    when others then null;
end $$;

-- 11. Storage Buckets (avatars, homework, chat-attachments, voice-messages)
insert into storage.buckets (id, name, public)
values 
    ('avatars', 'avatars', true),
    ('homework', 'homework', true),
    ('chat-attachments', 'chat-attachments', true),
    ('voice-messages', 'voice-messages', true)
on conflict (id) do nothing;
