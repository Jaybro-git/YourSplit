-- "Leave group": remove yourself without destroying the group for everyone
-- else (which is what delete_group / the owner-only delete policy does).
--
-- Two things make this more than a DELETE:
--
-- 1. expenses.paid_by and settlements.from/to_member_id are ON DELETE
--    RESTRICT against group_members. That's deliberate — dropping a member
--    who appears in an expense would silently corrupt everyone's balances.
--    So a member with any history can't be deleted at all. Instead we unlink
--    the account (user_id -> null), turning the row back into a ghost: the
--    remaining members keep intact history and balances, and the leaver loses
--    access because RLS keys off group_members.user_id = auth.uid(). This is
--    exactly the inverse of claim_ghost_member. A member with no history at
--    all is deleted outright, since there's nothing to preserve.
--
-- 2. groups.owner_id drives the delete policy. If the owner walked away the
--    group would become undeletable, so ownership is handed to the
--    longest-standing remaining linked member first. If there is nobody to
--    hand it to, leaving is refused — that user should delete the group.

create or replace function public.leave_group(gid uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  my_member_id uuid;
  next_owner uuid;
  has_history boolean;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  select id into my_member_id
  from public.group_members
  where group_id = gid and user_id = uid;

  if not found then
    raise exception 'not_a_member';
  end if;

  if exists (select 1 from public.groups g where g.id = gid and g.owner_id = uid) then
    select gm.user_id into next_owner
    from public.group_members gm
    where gm.group_id = gid
      and gm.user_id is not null
      and gm.user_id <> uid
    order by gm.created_at
    limit 1;

    if next_owner is null then
      raise exception 'last_member_must_delete';
    end if;

    update public.groups set owner_id = next_owner where id = gid;
  end if;

  select
    exists (
      select 1 from public.expenses e
      where e.group_id = gid
        and (e.paid_by = my_member_id or my_member_id = any(e.participant_ids))
    )
    or exists (
      select 1 from public.settlements s
      where s.group_id = gid
        and (s.from_member_id = my_member_id or s.to_member_id = my_member_id)
    )
  into has_history;

  if has_history then
    update public.group_members set user_id = null where id = my_member_id;
  else
    delete from public.group_members where id = my_member_id;
  end if;
end;
$$;

grant execute on function public.leave_group(uuid) to authenticated;
