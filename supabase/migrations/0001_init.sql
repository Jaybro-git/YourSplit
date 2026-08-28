-- YourSplit — initial schema for Google-auth + shared cloud groups.
-- Run this in the Supabase dashboard SQL Editor (Project → SQL Editor → New query).
-- Idempotent-ish: safe to re-run on a fresh project; not designed to be re-run
-- after data exists (no down-migration).

-- ============================================================================
-- Extensions
-- ============================================================================
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ============================================================================
-- profiles — one row per Supabase auth user, kept in sync by a trigger below.
-- ============================================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- Populates `profiles` the moment someone signs in with Google for the
-- first time. security definer because auth.users triggers run before the
-- new user has any session/RLS context of their own.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- groups
-- ============================================================================
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  owner_id uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- group_members — the new Person. `user_id null` = ghost (name-only, no
-- account). Expenses/settlements reference member ids, never user ids, so
-- balance math never needs to know who's a ghost and who isn't.
-- ============================================================================
create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) > 0),
  user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

-- A real user can only occupy one member slot per group (prevents duplicate
-- joins / re-accepting an invite creating a second row).
create unique index group_members_group_user_unique
  on public.group_members (group_id, user_id)
  where user_id is not null;

-- ============================================================================
-- expenses — mirrors src/types/index.ts Expense almost verbatim. `splits`
-- stored as jsonb (ExpenseSplit[]) since balances are always computed
-- client-side and never aggregated in SQL; ON DELETE RESTRICT on paid_by so
-- removing a member who's paid for something fails loudly instead of
-- corrupting balances.
-- ============================================================================
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  description text not null,
  total_cents bigint not null check (total_cents >= 0),
  paid_by uuid not null references public.group_members (id) on delete restrict,
  participant_ids uuid[] not null default '{}',
  split_method text not null check (split_method in ('equal', 'exact')),
  splits jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index expenses_group_id_idx on public.expenses (group_id);

-- ============================================================================
-- settlements
-- ============================================================================
create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  from_member_id uuid not null references public.group_members (id) on delete restrict,
  to_member_id uuid not null references public.group_members (id) on delete restrict,
  amount_cents bigint not null check (amount_cents > 0),
  created_at timestamptz not null default now()
);

create index settlements_group_id_idx on public.settlements (group_id);

-- ============================================================================
-- group_invites — the token *is* the credential; anyone holding the link can
-- join. 7-day default expiry, revocable, single-use-friendly via max_uses.
-- ============================================================================
create table public.group_invites (
  -- hex, not base64url: PostgreSQL's encode() only supports base64/hex/escape
  -- before PG 18, and a bad encoding name here fails at INSERT time rather
  -- than at CREATE TABLE. hex is URL-safe with no padding to strip.
  token text primary key default encode(gen_random_bytes(18), 'hex'),
  group_id uuid not null references public.groups (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  max_uses int not null default 20 check (max_uses > 0),
  uses int not null default 0 check (uses >= 0),
  revoked boolean not null default false
);

create index group_invites_group_id_idx on public.group_invites (group_id);

-- ============================================================================
-- Membership helper — SECURITY DEFINER so it bypasses RLS internally and
-- breaks the recursion that would otherwise happen if a group_members policy
-- queried group_members directly.
-- ============================================================================
create function public.is_group_member(gid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = auth.uid()
  );
$$;

-- ============================================================================
-- accept_invite — runs as the invite creator's privileges so a not-yet-member
-- can be inserted into group_members despite normal RLS forbidding it. Every
-- failure mode is a distinct error message the client can map to UI copy.
-- ============================================================================
create function public.accept_invite(invite_token text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  inv record;
  existing_member_id uuid;
  new_group_id uuid;
begin
  select * into inv from public.group_invites where token = invite_token for update;

  if inv is null then
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
  select inv.group_id, coalesce(p.display_name, p.email, 'New member'), auth.uid()
  from public.profiles p where p.id = auth.uid();

  update public.group_invites set uses = uses + 1 where token = invite_token;

  new_group_id := inv.group_id;
  return new_group_id;
end;
$$;

-- ============================================================================
-- claim_ghost_member — links the caller's account to an existing name-only
-- member row, so historical expenses/settlements attributed to that ghost
-- carry over instead of the caller starting as a fresh, empty member.
-- ============================================================================
create function public.claim_ghost_member(member_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  m record;
begin
  select * into m from public.group_members where id = member_id for update;

  if m is null then
    raise exception 'member_not_found';
  end if;
  if m.user_id is not null then
    raise exception 'member_already_claimed';
  end if;
  if not public.is_group_member(m.group_id) then
    raise exception 'not_a_group_member';
  end if;

  -- Caller must already have their own (freshly-joined) member row in this
  -- group; folding into the ghost means dropping that empty row and
  -- repointing the ghost row to the caller instead.
  delete from public.group_members
  where group_id = m.group_id and user_id = auth.uid() and id <> member_id;

  update public.group_members set user_id = auth.uid() where id = member_id;
end;
$$;

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.expenses enable row level security;
alter table public.settlements enable row level security;
alter table public.group_invites enable row level security;

-- profiles: readable by anyone who shares a group with you; only you can
-- update your own row.
create policy profiles_select on public.profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1 from public.group_members gm_self
      join public.group_members gm_other on gm_other.group_id = gm_self.group_id
      where gm_self.user_id = auth.uid() and gm_other.user_id = profiles.id
    )
  );

create policy profiles_update_own on public.profiles for update
  using (id = auth.uid());

-- groups. The "or owner_id = auth.uid()" is load-bearing, not belt-and-braces:
-- addGroup() inserts a group and reads it back with `.select()` before it can
-- create the owner's group_members row (that row needs the group id), so at
-- that instant is_group_member(id) is still false and the RETURNING row would
-- be filtered out by this policy.
create policy groups_select on public.groups for select
  using (public.is_group_member(id) or owner_id = auth.uid());

create policy groups_insert on public.groups for insert
  with check (owner_id = auth.uid());

create policy groups_update on public.groups for update
  using (public.is_group_member(id) or owner_id = auth.uid());

create policy groups_delete on public.groups for delete
  using (owner_id = auth.uid());

-- group_members
create policy group_members_select on public.group_members for select
  using (public.is_group_member(group_id));

-- `is_group_member(group_id)` OR "I own this group" — the OR is required to
-- bootstrap: right after a group is created its owner has no group_members
-- row yet, so is_group_member() alone would lock them out of adding
-- themselves (or anyone else) as the first member.
create policy group_members_insert on public.group_members for insert
  with check (
    public.is_group_member(group_id)
    or exists (select 1 from public.groups where id = group_id and owner_id = auth.uid())
  );

create policy group_members_update on public.group_members for update
  using (public.is_group_member(group_id));

create policy group_members_delete on public.group_members for delete
  using (public.is_group_member(group_id));

-- expenses
create policy expenses_all_select on public.expenses for select
  using (public.is_group_member(group_id));
create policy expenses_all_insert on public.expenses for insert
  with check (public.is_group_member(group_id));
create policy expenses_all_update on public.expenses for update
  using (public.is_group_member(group_id));
create policy expenses_all_delete on public.expenses for delete
  using (public.is_group_member(group_id));

-- settlements
create policy settlements_all_select on public.settlements for select
  using (public.is_group_member(group_id));
create policy settlements_all_insert on public.settlements for insert
  with check (public.is_group_member(group_id));
create policy settlements_all_update on public.settlements for update
  using (public.is_group_member(group_id));
create policy settlements_all_delete on public.settlements for delete
  using (public.is_group_member(group_id));

-- group_invites — deliberately no "select by anyone with the token" policy;
-- the /join/[token] page and accept_invite() both run through the
-- security-definer RPC path or a dedicated lookup, never a raw table select
-- from an unauthenticated/non-member client.
create policy group_invites_select on public.group_invites for select
  using (
    public.is_group_member(group_id)
    or exists (select 1 from public.groups where id = group_id and owner_id = auth.uid())
  );
create policy group_invites_insert on public.group_invites for insert
  with check (
    created_by = auth.uid()
    and (
      public.is_group_member(group_id)
      or exists (select 1 from public.groups where id = group_id and owner_id = auth.uid())
    )
  );
create policy group_invites_update on public.group_invites for update
  using (public.is_group_member(group_id));

-- ============================================================================
-- get_invite_preview — lets a signed-in, not-yet-member user see the group
-- name + member count for a token before joining, without granting a raw
-- select policy on group_invites/groups to non-members.
-- ============================================================================
create function public.get_invite_preview(invite_token text)
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
      -- `gm.` qualification is required: a bare `group_id` here would match
      -- both group_members.group_id and this function's OUT parameter of the
      -- same name, which PL/pgSQL rejects as ambiguous at runtime.
      (select count(*) from public.group_members gm where gm.group_id = g.id),
      (not inv.revoked and inv.expires_at > now() and inv.uses < inv.max_uses)
    from public.groups g
    where g.id = inv.group_id;
end;
$$;

grant execute on function public.accept_invite(text) to authenticated;
grant execute on function public.claim_ghost_member(uuid) to authenticated;
grant execute on function public.get_invite_preview(text) to authenticated;
