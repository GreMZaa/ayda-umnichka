-- 1. Enhance homework table
ALTER TABLE public.homework ALTER COLUMN student_id DROP NOT NULL;
ALTER TABLE public.homework ALTER COLUMN teacher_id DROP NOT NULL;
ALTER TABLE public.homework ADD COLUMN IF NOT EXISTS student_public_id text;
ALTER TABLE public.homework ADD COLUMN IF NOT EXISTS student_name text;
ALTER TABLE public.homework ADD COLUMN IF NOT EXISTS teacher_name text;
ALTER TABLE public.homework ADD COLUMN IF NOT EXISTS file_name text;

CREATE INDEX IF NOT EXISTS idx_homework_student_public_id ON public.homework(student_public_id);
CREATE INDEX IF NOT EXISTS idx_homework_created_at ON public.homework(created_at DESC);

-- Enable RLS & policies on homework
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select homework" ON public.homework;
CREATE POLICY "Allow select homework" ON public.homework FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert homework" ON public.homework;
CREATE POLICY "Allow insert homework" ON public.homework FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update homework" ON public.homework;
CREATE POLICY "Allow update homework" ON public.homework FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow delete homework" ON public.homework;
CREATE POLICY "Allow delete homework" ON public.homework FOR DELETE USING (true);

-- 2. Enhance lessons table
ALTER TABLE public.lessons ALTER COLUMN student_id DROP NOT NULL;
ALTER TABLE public.lessons ALTER COLUMN teacher_id DROP NOT NULL;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS student_public_id text;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS student_name text;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS teacher_name text;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS topic text;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;

CREATE INDEX IF NOT EXISTS idx_lessons_student_public_id ON public.lessons(student_public_id);
CREATE INDEX IF NOT EXISTS idx_lessons_status ON public.lessons(status);
CREATE INDEX IF NOT EXISTS idx_lessons_created_at ON public.lessons(created_at DESC);

-- Enable RLS & policies on lessons
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select lessons" ON public.lessons;
CREATE POLICY "Allow select lessons" ON public.lessons FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert lessons" ON public.lessons;
CREATE POLICY "Allow insert lessons" ON public.lessons FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update lessons" ON public.lessons;
CREATE POLICY "Allow update lessons" ON public.lessons FOR UPDATE USING (true);

-- 3. Enhance teacher_students table
ALTER TABLE public.teacher_students ALTER COLUMN student_id DROP NOT NULL;
ALTER TABLE public.teacher_students ALTER COLUMN teacher_id DROP NOT NULL;
ALTER TABLE public.teacher_students ADD COLUMN IF NOT EXISTS student_public_id text;
ALTER TABLE public.teacher_students ADD COLUMN IF NOT EXISTS student_name text;
ALTER TABLE public.teacher_students ADD COLUMN IF NOT EXISTS teacher_public_id text;

ALTER TABLE public.teacher_students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select teacher_students" ON public.teacher_students;
CREATE POLICY "Allow select teacher_students" ON public.teacher_students FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert teacher_students" ON public.teacher_students;
CREATE POLICY "Allow insert teacher_students" ON public.teacher_students FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete teacher_students" ON public.teacher_students;
CREATE POLICY "Allow delete teacher_students" ON public.teacher_students FOR DELETE USING (true);
