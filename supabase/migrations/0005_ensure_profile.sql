-- Fixes: insert or update on table "groups" violates foreign key constraint
-- "groups_owner_id_fkey" — i.e. a signed-in user with no public.profiles row.
--
-- 0001 relied on a trigger on auth.users to create the profile. That schema is
-- owned by supabase_auth_admin, so CREATE TRIGGER on auth.users can fail with
-- insufficient privilege depending on the project — and when it does, the
-- statement error is easy to miss in the SQL Editor while everything else in
-- the migration succeeds. The result is a user who can authenticate fine but
-- owns no profile, so every FK pointing at profiles blows up on first write.
--
-- Rather than depend on that trigger, profile creation is now lazy and
-- self-healing: ensure_profile() builds the row from auth.jwt() alone. It
-- needs no access to auth.users at all, so it works regardless of schema
-- ownership, and it is idempotent so callers can invoke it freely.

create or replace function public.ensure_profile()
returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  claims jsonb;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  if exists (select 1 from public.profiles p where p.id = uid) then
    return;
  end if;

  claims := auth.jwt();

  -- profiles.email is NOT NULL; coalesce so a provider that omits the claim
  -- degrades to an empty string instead of failing the insert.
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    uid,
    coalesce(claims ->> 'email', ''),
    coalesce(
      claims -> 'user_metadata' ->> 'full_name',
      claims -> 'user_metadata' ->> 'name'
    ),
    claims -> 'user_metadata' ->> 'avatar_url'
  )
  on conflict (id) do nothing;
end;
$$;

grant execute on function public.ensure_profile() to authenticated;

-- Every RPC that writes a row referencing profiles now guarantees the profile
-- exists first.
create or replace function public.create_group(group_name text)
returns public.groups
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  new_group public.groups;
  member_name text;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  perform public.ensure_profile();

  insert into public.groups (name, owner_id)
  values (group_name, uid)
  returning * into new_group;

  select coalesce(p.display_name, p.email, 'Me') into member_name
  from public.profiles p where p.id = uid;

  insert into public.group_members (group_id, display_name, user_id)
  values (new_group.id, coalesce(nullif(member_name, ''), 'Me'), uid);

  return new_group;
end;
$$;

grant execute on function public.create_group(text) to authenticated;

create or replace function public.accept_invite(invite_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  inv record;
  existing_member_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  perform public.ensure_profile();

  select * into inv from public.group_invites where token = invite_token for update;

  if not found then
    raise exception 'invite_not_found';
  end if;
  if inv.revoked then
    raise exception 'invite_revoked';
  end if;
  if inv.expires_at < now() then
    raise exception 'invite_expired';
  end if;
  if inv.uses >= inv.max_uses then
    raise exception 'invite_exhausted';
  end if;

  select id into existing_member_id
  from public.group_members
  where group_id = inv.group_id and user_id = auth.uid();

  if existing_member_id is not null then
    -- Already a member — treat as a no-op success rather than an error.
    return inv.group_id;
  end if;

  insert into public.group_members (group_id, display_name, user_id)
  select inv.group_id, coalesce(nullif(p.display_name, ''), nullif(p.email, ''), 'New member'), auth.uid()
  from public.profiles p where p.id = auth.uid();

  update public.group_invites set uses = uses + 1 where token = invite_token;

  return inv.group_id;
end;
$$;

grant execute on function public.accept_invite(text) to authenticated;

-- Backfill anyone who already signed in before this migration. Wrapped
-- because reading auth.users is itself privilege-dependent; ensure_profile()
-- covers those users on their next write either way.
do $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  select
    u.id,
    coalesce(u.email, ''),
    coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
    u.raw_user_meta_data ->> 'avatar_url'
  from auth.users u
  where not exists (select 1 from public.profiles p where p.id = u.id)
  on conflict (id) do nothing;
exception when others then
  raise notice 'Backfill from auth.users skipped: %', sqlerrm;
end $$;

-- Re-attempt the trigger so the normal path still populates profiles at
-- signup. Non-fatal: if the auth schema is not ours to attach to,
-- ensure_profile() is the real guarantee.
do $$
begin
  drop trigger if exists on_auth_user_created on auth.users;
  create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();
exception when others then
  raise notice 'Could not attach trigger to auth.users: %. ensure_profile() covers it.', sqlerrm;
end $$;
