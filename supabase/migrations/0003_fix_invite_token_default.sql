-- Fixes invite creation failing with: unrecognized encoding: "base64url"
--
-- 0001 defaulted group_invites.token to encode(gen_random_bytes(18),
-- 'base64url'). PostgreSQL's encode() only accepts 'base64', 'hex' and
-- 'escape' — 'base64url' was not added until PG 18, and Supabase runs older.
-- CREATE TABLE still succeeded because a DEFAULT expression is only parsed
-- and type-checked at creation time (encode(bytea, text) is valid), never
-- evaluated, so the failure surfaced on the first INSERT instead.
--
-- hex is used rather than hand-rolling URL-safe base64 (translate '+/' to
-- '-_' and strip '='): it is URL-safe by construction with no padding or
-- character-class edge cases to get wrong. 18 bytes -> 36 hex chars, still
-- 144 bits of entropy, which is ample for a bearer token.

alter table public.group_invites
  alter column token set default encode(gen_random_bytes(18), 'hex');
