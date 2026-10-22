-- Схема базы данных для образовательной платформы «АйДаУмничка»
-- Выполните этот скрипт в SQL Editor вашего проекта Supabase

-- 1. Таблица профилей пользователей
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  name text not null,
  role text not null check (role in ('ADMIN', 'TEACHER', 'STUDENT', 'PARENT')),
  phone text,
  avatar_url text,
  bio text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 2. Связка родитель - ребенок
create table if not exists public.parent_students (
  id uuid default gen_random_uuid() primary key,
  parent_id uuid references public.profiles(id) on delete cascade not null,
  student_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  unique (parent_id, student_id)
);

-- 3. Предметы
create table if not exists public.subjects (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  color text default '#2563eb' not null,
  created_at timestamptz default now() not null
);

-- 4. Уроки
create table if not exists public.lessons (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  subject_id uuid references public.subjects(id) on delete cascade not null,
  teacher_id uuid references public.profiles(id) on delete cascade not null,
  student_id uuid references public.profiles(id) on delete cascade not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  status text default 'SCHEDULED' check (status in ('SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED')),
  room_name text unique not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 5. Заметки и отчеты по урокам
create table if not exists public.lesson_notes (
  id uuid default gen_random_uuid() primary key,
  lesson_id uuid references public.lessons(id) on delete cascade not null,
  author_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  grade int check (grade >= 1 and grade <= 5),
  feedback text,
  is_public_for_parent boolean default true not null,
  created_at timestamptz default now() not null
);

-- 6. Межустройственные сообщения чата
create table if not exists public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  chat_id text not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  sender_name text not null,
  sender_avatar text,
  text text not null,
  type text default 'text' check (type in ('text', 'voice', 'file', 'lesson_invite')),
  file_url text,
  file_name text,
  file_size text,
  created_at timestamptz default now() not null
);

-- 7. Сдача и проверка домашних заданий
create table if not exists public.homework_submissions (
  id uuid default gen_random_uuid() primary key,
  lesson_id uuid references public.lessons(id) on delete cascade,
  student_id uuid references public.profiles(id) on delete cascade not null,
  student_name text not null,
  teacher_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  subject text not null,
  student_answer text,
  file_url text,
  file_name text,
  file_size text,
  status text default 'SUBMITTED' check (status in ('NEW', 'SUBMITTED', 'CHECKED')),
  grade int check (grade >= 1 and grade <= 5),
  teacher_feedback text,
  submitted_at timestamptz default now() not null,
  reviewed_at timestamptz
);

-- Индексы для ускорения запросов
create index if not exists idx_lessons_teacher on public.lessons(teacher_id);
create index if not exists idx_lessons_student on public.lessons(student_id);
create index if not exists idx_lessons_start_time on public.lessons(start_time);
create index if not exists idx_lesson_notes_lesson on public.lesson_notes(lesson_id);
create index if not exists idx_chat_messages_chat on public.chat_messages(chat_id);
create index if not exists idx_chat_messages_created on public.chat_messages(created_at);
create index if not exists idx_hw_student on public.homework_submissions(student_id);
create index if not exists idx_hw_teacher on public.homework_submissions(teacher_id);

-- Включение Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_notes enable row level security;
alter table public.chat_messages enable row level security;
alter table public.homework_submissions enable row level security;

-- Базовые политики безопасности (чтение и запись)
create policy "Allow read access to profiles" on public.profiles for select using (true);
create policy "Allow read access to lessons" on public.lessons for select using (true);
create policy "Allow read access to lesson notes" on public.lesson_notes for select using (true);
create policy "Allow read access to chat messages" on public.chat_messages for select using (true);
create policy "Allow insert chat messages" on public.chat_messages for insert with check (true);
create policy "Allow read access to homework" on public.homework_submissions for select using (true);
create policy "Allow write access to homework" on public.homework_submissions for all using (true);

-- Начальные предметы
insert into public.subjects (name, color) values
  ('Математика и логика', '#2563eb'),
  ('Русский язык и каллиграфия', '#d946ef'),
  ('Английский язык', '#059669'),
  ('Подготовка к школе', '#d97706')
on conflict do nothing;
