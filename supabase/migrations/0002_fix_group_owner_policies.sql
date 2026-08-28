-- Fixes the owner bootstrap gap on `groups`.
--
-- 0001 gave group_members an "or I own this group" escape hatch for INSERT but
-- left `groups` itself gated purely on is_group_member(). That breaks group
-- creation: addGroup() inserts the group and reads it back with
-- `.select().single()` BEFORE it can insert the owner's group_members row
-- (the member row needs the group's id, so it can't come first). At that
-- instant is_group_member(id) is false, so the RETURNING row is filtered by
-- the SELECT policy and the insert fails with a row-level security error.
--
-- Owning a group now always implies being able to see and update it,
-- independent of membership.

drop policy if exists groups_select on public.groups;
create policy groups_select on public.groups for select
  using (public.is_group_member(id) or owner_id = auth.uid());

drop policy if exists groups_update on public.groups;
create policy groups_update on public.groups for update
  using (public.is_group_member(id) or owner_id = auth.uid());

-- Same reasoning for invites: the owner should be able to create a share link
-- for a group they own even in the window before they're a member row.
drop policy if exists group_invites_select on public.group_invites;
create policy group_invites_select on public.group_invites for select
  using (
    public.is_group_member(group_id)
    or exists (select 1 from public.groups where id = group_id and owner_id = auth.uid())
  );

drop policy if exists group_invites_insert on public.group_invites;
create policy group_invites_insert on public.group_invites for insert
  with check (
    created_by = auth.uid()
    and (
      public.is_group_member(group_id)
      or exists (select 1 from public.groups where id = group_id and owner_id = auth.uid())
    )
  );

-- create_group — group + owner's member row in one transaction.
--
-- Doing this client-side needed two round trips with an unavoidable window
-- between them (the member row needs the group id, so the group must exist
-- first). That window is what the policy fix above patches, and it also meant
-- a failure on the second insert left an ownerless, memberless group behind.
-- One RPC removes both problems. It is SECURITY DEFINER but not a privilege
-- hole: owner_id and user_id are forced to auth.uid(), never taken from args.
create function public.create_group(group_name text)
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

  insert into public.groups (name, owner_id)
  values (group_name, uid)
  returning * into new_group;

  select coalesce(p.display_name, p.email, 'Me') into member_name
  from public.profiles p where p.id = uid;

  insert into public.group_members (group_id, display_name, user_id)
  values (new_group.id, coalesce(member_name, 'Me'), uid);

  return new_group;
end;
$$;

grant execute on function public.create_group(text) to authenticated;

-- Backfill: `groups.owner_id` and `group_invites.created_by` both reference
-- public.profiles, so a signed-in user with no profiles row hits a foreign-key
-- error instead. The handle_new_user trigger only fires for users created
-- AFTER 0001 ran, so anyone who signed up before that has no profile.
insert into public.profiles (id, email, display_name, avatar_url)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
  u.raw_user_meta_data ->> 'avatar_url'
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;
