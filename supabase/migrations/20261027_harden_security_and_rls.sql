-- ============================================================
-- MIGRATION: HARDEN ROW LEVEL SECURITY & PROTECTION
-- ============================================================

-- 1. Remove insecure public write/update policies on user_bindings
drop policy if exists "Allow public insert user_bindings" on public.user_bindings;
drop policy if exists "Allow public update user_bindings" on public.user_bindings;

-- 2. Restrict user_bindings mutations strictly to service_role and verified owners
create policy "Allow service and owner insert user_bindings"
    on public.user_bindings for insert
    with check (
        auth.role() = 'service_role' or
        auth.uid() = auth_user_id
    );

create policy "Allow service and owner update user_bindings"
    on public.user_bindings for update
    using (
        auth.role() = 'service_role' or
        auth.uid() = auth_user_id
    )
    with check (
        auth.role() = 'service_role' or
        (auth.uid() = auth_user_id and role = 'student')
    );

-- 3. Restrict homework modifications strictly to assigned participants and teachers
drop policy if exists "Teachers and students can update homework" on public.homework;
create policy "Teachers and students can update homework"
    on public.homework for update
    using (
        auth.role() = 'service_role' or
        auth.uid() = student_id or
        auth.uid() = teacher_id
    );

-- 4. Restrict lesson updates to lesson participants
drop policy if exists "Teachers can create and manage lessons" on public.lessons;
create policy "Teachers can manage their own lessons"
    on public.lessons for all
    using (
        auth.role() = 'service_role' or
        auth.uid() = teacher_id or
        auth.uid() = student_id
    );

-- 5. Restrict public bucket access if storage policies apply
update storage.buckets
set public = false
where id in ('homework', 'voice-messages', 'chat-attachments');
