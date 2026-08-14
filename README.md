# Splits

A local-only, no-auth "Expense Splitter" for groups: log shared expenses, see net
balances, and get a minimal set of payments to settle up. All state lives in the
browser via `localStorage`; there is no backend and no database.

## The prompt

This app was built as a take-home assignment. Condensed brief:

> Build a single-session Expense Splitter (Splitwise-inspired). Local-only, no
> auth, no backend, persisted with a custom `useLocalStorage` hook. Support
> adding people to a group, logging expenses (amount, payer, participants,
> equal or exact split), editing/deleting expenses with live-recalculating
> balances, a balances view, and a "Settle Up" view with a minimized list of
> transactions. Hard constraints: all money handled as integer cents (no
> floating point), a "penny drop" rule so equal splits always sum exactly to
> the total, and a greedy debt-simplification algorithm to minimize the
> number of settle-up transactions.

### Follow-up requests

The build happened as a running conversation, not one shot. Roughly in order:

1. Bare scaffold first, just "Create a Next.js web app", before the spec above.
2. The spec above, then "refer to Splitwise too" as a nudge on UX polish.
3. Rework into **multi-group**: named groups instead of one flat session,
   bento-box white-and-amber redesign, "+" buttons for group/member/expense
   instead of tabs, a top-of-screen debt summary, a Members panel.
4. Apple HIG-flavored pass: bigger type, the whole app as one centered
   rounded panel, plus a real **Settle Up** action (recording actual
   payments, full or partial, not just a suggested list) and an activity
   log color-coded by entry type.
5. Delete-group button, but only once a group is fully settled up.
6. Minimalist "Apple + Nike" pass: cut the palette down hard, keep the
   existing amber theme rather than introducing a new one.
7. Partial reversal: distinct hashed colors back on avatars, and light
   shaded backgrounds on the bento cards.
8. Add-expense tooltip explaining the penny-drop rule, plus drag-to-reorder
   participants so the user controls who gets the leftover cent(s).
9. Expense date picker (back-datable); settlement dates stay auto-set to
   "now" and aren't user-editable.
10. Members panel rows re-colored to green/red by owed/owes status.
11. This README: a Features section, an Example Workflow section, and this
    prompt history.

## Features

**Groups**
- Home screen is a bento grid of groups, each in its own hashed accent color.
  "+ Add group" creates one by name (e.g. a trip or a flat).
- "Delete" appears on a group's card only once it's fully settled up (no
  pending payments), so a group with open debts can't be deleted by accident.

**Members**
- "Members" opens a panel to add or remove people and see each person's
  live balance ("Owes Rs. X" / "Is owed Rs. X" / "Settled up"), row shaded
  green (owed), red (owes), or neutral (settled).
- Removing a member referenced by an expense is blocked, with the list of
  expenses that reference them.

**Logging expenses**
- Description, total amount (LKR), who paid, who's involved (multi-select),
  and a date, defaulting to today but editable to back-date an expense.
- Split method: **Equal** (live per-person preview) or **Exact** (live
  "remaining" indicator until per-person amounts sum to the total).
- Participant rows are drag-to-reorder (grip handle); an info tooltip
  explains why order matters: on an uneven equal split, the leftover
  cent(s) go to whoever is first in the list, so dragging controls who eats
  the rounding. The preview tags recipients with `(+1¢)`.
- Edit or delete any expense; balances and Settle Up recalculate instantly.

**Settle Up**
- A strip of the minimal set of payments needed to zero the group out
  (e.g. "Bob pays Carol Rs. 7,000.00"), via the greedy debt-simplification
  algorithm.
- Each suggested payment has a **Settle** button, opening a modal prefilled with
  the full amount, editable down for a partial payment. Confirming records
  a real `Settlement`, dated to the moment it's recorded (not user-editable,
  unlike expense dates), which feeds straight back into balances; a partial
  payment leaves the smaller remainder as the next suggested transaction.

**Activity feed**
- Single feed of everything that moved money in the group, newest first:
  expenses in a light amber card ("Edit" / "Delete"), settlements in a light
  green card ("Delete" only, since a payment is a fact, not something you edit).
  Each row shows its date.

**Persistence**
- Everything lives in the browser's `localStorage`, no backend/database.
  Groups, members, expenses, and settlements all survive a page reload.

## Example Workflow

A walkthrough touching every feature, end to end:

1. **Create a group.** On the home screen, "+ Add group" → name it "Goa
   Trip". It appears as a bento card and opens straight away, empty, so no
   Delete button yet (nothing to be settled up on).
2. **Add members.** Open **Members**, add Alice, Bob, Carol, Dave one at a
   time. Each gets a distinct hashed color, reused for their avatar and any
   card tied to them. All four show "Settled up" since there's no activity.
3. **Log an equal-split expense.** "+ Add expense" → description "Trip
   essentials", amount 12000, paid by Alice, all four checked, split method
   Equal, date left at today. The preview shows Rs. 3,000.00 each (divides
   evenly here, so no `(+1¢)` tag). Save.
4. **Log an exact-split expense, and back-date it.** "+ Add expense" →
   "Groceries", amount 10000, paid by Carol, uncheck Carol (she isn't
   splitting her own payment), switch to Exact Amount, enter 3333.33 /
   3333.33 / 3333.34 for Alice / Bob / Dave. Change the Date field to an
   earlier day, and the entry will sort into the Activity feed by that date,
   not today. "Splits match the total" turns green once the three amounts
   sum to 10000; save.
5. **See the penny-drop rule in action, and control it.** "+ Add expense" →
   "Snacks", amount 6000, paid by Dave, only Dave and Bob checked, Equal
   split. Rs. 100.00 split two ways is even, so to see it matter, imagine an
   odd total like Rs. 99.99 between them: whoever is first in the "Split
   between" list gets the extra cent. Hover the ⓘ next to the label for the
   rule, then drag a row by its grip handle to reorder: the preview's
   `(+1¢)` tag jumps to whoever is now first.
6. **Check balances.** Open **Members**: Alice and Carol are shaded green
   ("Is owed Rs. X"), Bob and Dave shaded red ("Owes Rs. X"), computed from
   all three expenses combined.
7. **Settle up, fully and partially.** The Settle Up strip lists the
   minimal payments needed (e.g. "Bob pays Carol Rs. 7,000.00", "Dave pays
   Alice Rs. 3,333.34"). Hit **Settle** on the first, confirm the prefilled
   full amount, and that pair zeroes out and the card disappears. Hit
   **Settle** on the second, edit the amount down to a partial payment, and
   confirm: the card shrinks to the remaining balance instead of
   disappearing.
8. **Review the Activity feed.** Newest first, expenses show as light amber
   cards (Edit / Delete) and the settlements just recorded show as light
   green cards (Delete only), each with its date. Editing or deleting any
   entry recalculates Members and Settle Up immediately.
9. **Delete the group.** Once every remaining Settle Up payment has been
   recorded and everyone's back to "Settled up", a **Delete** button appears
   on the group's home-screen card, and Goa Trip can now be removed for good.

## Algorithms

### Money as integer cents

All amounts are converted to integer cents at the form boundary
(`toCents` in [`src/lib/money.ts`](src/lib/money.ts)) and stored as integers
on `Expense.totalCents` / `ExpenseSplit.amountCents`. Every calculation
(balances, splitting, settling) operates purely on integers; cents are only
divided back to rupees for display (`formatCurrency`). This avoids all
binary floating-point rounding drift.

### Remainder distribution ("penny drop")

`splitEqually(totalCents, participantIds)` divides a total evenly and must
still land on an exact integer number of cents per person:

```
base      = floor(totalCents / n)
remainder = totalCents - base * n        // 0 <= remainder < n
```

Every participant gets `base`; the first `remainder` participants, in the
order they appear in `participantIds`, get one extra cent each. Example:
Rs. 100.00 split three ways: base = 3333, remainder = 1, giving `[3334, 3333,
3333]`. This generalizes the spec's "give the leftover cent to the first
person" rule to any remainder size (e.g. splitting among 7 people can leave
up to 6 leftover cents), and the split always sums to exactly `totalCents`
by construction, verified in [`src/lib/money.test.ts`](src/lib/money.test.ts).

### Balances

`computeBalances(people, expenses, settlements)` in
[`src/lib/balances.ts`](src/lib/balances.ts) walks every expense once: the
payer's balance goes up by the full amount, and each participant's balance
goes down by their split share. A positive balance means the group owes
that person money; negative means they owe the group. Balances always sum
to exactly zero across a group, by construction.

A recorded `Settlement` (an actual payment from one person to another, via
the Settle Up button) folds in the same way but mirrored: the payer's
balance goes *up* by the amount paid, the receiver's goes *down*, exactly
undoing that much of the debt between them. A full settlement zeroes the
pair out; a partial one just shrinks what's still owed, and the next Settle
Up render reflects the smaller remainder automatically.

### Debt simplification (greedy max-creditor / max-debtor)

`simplifyDebts(balances)` in [`src/lib/settleUp.ts`](src/lib/settleUp.ts)
turns raw net balances into a minimized list of payments:

1. Split people into creditors (balance > 0) and debtors (balance < 0).
2. Repeatedly take the current largest creditor and largest debtor, and
   settle the smaller of the two amounts between them as one transaction.
3. Whichever side hits zero drops out; the other carries its remainder into
   the next round. Repeat until both lists are empty.

This is the standard greedy approach Splitwise-style apps use to collapse
an N-person tangle of debts into at most `N - 1` transactions, far fewer
than settling every pairwise debt individually. Verified against the
assignment's 4-person test scenario in
[`src/lib/settleUp.test.ts`](src/lib/settleUp.test.ts): balances
`Alice +566,667 / Bob -933,333 / Carol +700,000 / Dave -333,334` (cents)
simplify to exactly 3 transactions, and the amounts each person pays/receives
sum back to their original balance exactly.

## Tech stack

- **Next.js** (App Router) + TypeScript, single client page: no routing,
  no server, state lives in React + `localStorage`.
- **Tailwind CSS v4**, custom design tokens (color + type) in
  [`src/app/globals.css`](src/app/globals.css): the whole app renders as one
  centered, large-radius rounded panel floating on a muted warm backdrop
  (an Apple System-Settings-style "app window"), white bento cards inside on
  a warm parchment canvas, amber accent, and the system font stack
  (`-apple-system, BlinkMacSystemFont, "SF Pro Display/Text", …`) so Apple
  devices render real SF Pro and everything else gets a sane native fallback,
  deliberately not a look-alike webfont.
- **Vitest** for the algorithmic core (`src/lib/**/*.test.ts`).

### `useLocalStorage` and hydration

The hook always renders `initialValue` on the first pass (matching what the
server rendered, since the server never sees `localStorage`), then swaps in
the persisted value inside a `useEffect` after mount. Reading synchronously
in the state initializer instead would make the client's first paint
diverge from the server's and trigger a React hydration error. This was
hit and fixed during development. Because a group's shape can gain fields
over time (e.g. `settlements` was added after `people`/`expenses`),
[`src/app/page.tsx`](src/app/page.tsx) normalizes every group read back out
of storage (`settlements` defaults to `[]` if missing) so older saved data
never crashes newer code.

## Project structure

```
src/
  types/index.ts        Person, Group, Expense, ExpenseSplit, Settlement, Transaction
  hooks/useLocalStorage.ts
  lib/
    money.ts             toCents, formatCurrency, splitEqually, sumSplits
    balances.ts          computeBalances (expenses + settlements)
    settleUp.ts          simplifyDebts (greedy)
    id.ts                generateId, timestampNow
  components/
    GroupCard.tsx, GroupDetail.tsx    home grid card / group screen
    SettleUpStrip.tsx, SettleUpModal.tsx   debt strip + record-a-payment modal
    ActivityFeed.tsx                  color-coded expense + settlement feed
    MembersPanel.tsx                  members modal (add/remove/balances)
    ExpenseForm.tsx                   add/edit an expense
    Modal.tsx, NameEntryModal.tsx     shared modal primitives
    AvatarBadge.tsx
  app/page.tsx            orchestrator: groups list <-> group detail
```

## Running it

```bash
npm install
npm run dev     # http://localhost:3000
npm run test    # vitest: money/balances/settle-up algorithms
npm run build   # production build + typecheck
npm run lint    # eslint
```
