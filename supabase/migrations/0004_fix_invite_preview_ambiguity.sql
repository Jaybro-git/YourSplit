-- Fixes /join/[token] showing "This invite is no longer valid" for a link
-- that is actually fine.
--
-- get_invite_preview declares an OUT column named `group_id`, and its member
-- count subquery filtered on a bare `where group_id = g.id`. Inside PL/pgSQL
-- that bare reference matches BOTH the OUT parameter and
-- group_members.group_id, and the default plpgsql.variable_conflict = error
-- turns that into a runtime "column reference group_id is ambiguous". The
-- page treats any RPC error as an invalid invite, hence the misleading copy.
--
-- This never showed up when probing with a nonexistent token: that path
-- early-returns before reaching the ambiguous statement, so the bug only
-- triggers once a token actually resolves to a row.
--
-- Fix: alias the table and qualify the column. Kept the OUT parameter names
-- as-is since src/app/join/[token]/page.tsx reads preview.group_id /
-- .group_name / .member_count / .valid.

create or replace function public.get_invite_preview(invite_token text)
returns table (group_id uuid, group_name text, member_count bigint, valid boolean)
language plpgsql security definer set search_path = public as $$
declare
  inv record;
begin
  select * into inv from public.group_invites where token = invite_token;
  if not found then
    return query select null::uuid, null::text, 0::bigint, false;
    return;
  end if;

  return query
    select
      g.id,
      g.name,
      (select count(*) from public.group_members gm where gm.group_id = g.id),
      (not inv.revoked and inv.expires_at > now() and inv.uses < inv.max_uses)
    from public.groups g
    where g.id = inv.group_id;
end;
$$;

grant execute on function public.get_invite_preview(text) to authenticated;
