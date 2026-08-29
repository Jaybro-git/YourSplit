-- Adds a category tag and a short free-text note to expenses.
--
-- No CHECK constraint on category on purpose: the category list is a
-- presentation concern that will change as categories are added or renamed,
-- and a CHECK would force a migration every time for no real safety gain —
-- the app is the only writer and TypeScript already narrows the value.
-- Unknown or legacy values degrade gracefully because categoryMeta() in
-- src/lib/categories.ts falls back to "other".
--
-- The note length cap is enforced in the DB as well as the form, so a
-- malformed client can't quietly store a paragraph in a field the UI renders
-- on a single line.

alter table public.expenses
  add column if not exists category text not null default 'other',
  add column if not exists note text;

alter table public.expenses
  drop constraint if exists expenses_note_length;

alter table public.expenses
  add constraint expenses_note_length check (note is null or char_length(note) <= 40);
