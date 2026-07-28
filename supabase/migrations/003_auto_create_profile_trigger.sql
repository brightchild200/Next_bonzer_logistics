-- ============================================================
-- BONZER LOGISTICS
-- 003 - AUTO CREATE PROFILE TRIGGER
-- ============================================================

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Insert into profiles table
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'mobile'
  );

  -- Assign default 'admin' role to the first user (owner)
  -- Or assign 'salesperson' role to subsequent users
  insert into public.user_roles (user_id, role_id)
  select
    new.id,
    r.id
  from public.roles r
  where r.name = 'salesperson'
  limit 1
  on conflict do nothing;

  return new;
end;
$$;

-- Drop trigger if exists and create new one
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();


-- ============================================================
-- RLS POLICIES FOR PROFILE CREATION
-- ============================================================

-- Allow users to insert their own profile (via trigger)
create policy "allow_insert_own_profile"
on public.profiles
for insert
to authenticated
with check (id = (select auth.uid()));


-- ============================================================
-- GRANT EXECUTE TO AUTHENTICATED
-- ============================================================

grant execute on function public.handle_new_user() to authenticated;
