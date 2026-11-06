-- Safe handle_new_user: valid role cast + sync existing user_bindings by email/public_id
create or replace function public.handle_new_user()
returns trigger as $$
declare
    v_public_id text;
    v_role user_role;
    v_role_text text;
    v_balance int;
begin
    v_public_id := nullif(trim(coalesce(new.raw_user_meta_data->>'public_id', '')), '');
    if v_public_id is null then
        select ub.public_id into v_public_id
        from public.user_bindings ub
        where lower(trim(coalesce(ub.email, ''))) = lower(trim(coalesce(new.email, '')))
        limit 1;
    end if;
    if v_public_id is null then
        v_public_id := 'id' || floor(100000 + random() * 900000)::text;
    end if;

    v_role_text := lower(trim(coalesce(new.raw_user_meta_data->>'role', 'student')));
    v_role := case
        when v_role_text in ('student', 'teacher', 'admin') then v_role_text::user_role
        else 'student'::user_role
    end;

    begin
        v_balance := coalesce((new.raw_user_meta_data->>'balance_lessons')::int, 0);
    exception when others then
        v_balance := 0;
    end;

    insert into public.profiles (id, full_name, role, phone, balance_lessons, public_id)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'full_name', 'Новый ученик'),
        v_role,
        new.raw_user_meta_data->>'phone',
        v_balance,
        v_public_id
    )
    on conflict (id) do update set
        full_name = excluded.full_name,
        role = excluded.role,
        phone = coalesce(excluded.phone, profiles.phone),
        balance_lessons = excluded.balance_lessons,
        public_id = coalesce(profiles.public_id, excluded.public_id),
        updated_at = now();

    insert into public.user_bindings (public_id, auth_user_id, role, full_name, phone, email, is_registered, balance_lessons)
    values (
        v_public_id,
        new.id,
        v_role_text,
        coalesce(new.raw_user_meta_data->>'full_name', 'Новый ученик'),
        new.raw_user_meta_data->>'phone',
        new.email,
        true,
        v_balance
    )
    on conflict (public_id) do update set
        auth_user_id = new.id,
        is_registered = true,
        email = coalesce(excluded.email, user_bindings.email),
        full_name = coalesce(excluded.full_name, user_bindings.full_name),
        role = coalesce(excluded.role, user_bindings.role),
        balance_lessons = coalesce(excluded.balance_lessons, user_bindings.balance_lessons),
        updated_at = now();

    return new;
end;
$$ language plpgsql security definer set search_path = public;
