-- Haroon Ibn Rasheed Online Quran Academy
-- SECURITY FIX: prevent public signup metadata from creating admin/teacher accounts.
-- Run this once in Supabase SQL Editor.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role, is_active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    'student',
    true
  )
  on conflict (id) do update
    set email = excluded.email;
  return new;
end;
$$;

-- Keep role controlled by administrators only.
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and new.role is distinct from old.role
     and not public.is_admin() then
    new.role := old.role;
  end if;

  if new.role not in ('admin','teacher','student') then
    new.role := old.role;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
before update on public.profiles
for each row execute function public.protect_profile_role();

-- Make sure the signup trigger uses the safe function.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
