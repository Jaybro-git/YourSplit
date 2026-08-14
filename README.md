# Splits

A local-only, no-auth "Expense Splitter" for groups — log shared expenses, see net
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

Two follow-up passes: (1) multi-group support (named groups, each with its
own members and expense log) with a bento-box, white-and-amber redesign,
modal-driven "+" actions instead of tabs; (2) an Apple HIG-flavored pass —
system font stack, bigger type, the whole app as one centered rounded
panel — plus an actual **Settle Up** action (recording real payments, not
just a suggested list) and a unified activity feed that color-codes
expenses vs. settlements.

## Using it

- **Groups** — the home screen is a bento grid of groups. "+ Add group"
  creates a new one by name (e.g. a trip or a flat).
- Inside a group: **"Members"** opens a panel to add/remove people and see
  each person's balance ("Owes Rs. X" / "Is owed Rs. X" / "Settled up").
  Removing a member referenced by an expense is blocked with an explanation.
- **"+ Add expense"** opens a form: amount (LKR), who paid, who's involved
  (multi-select), and split method (Equal or Exact). Exact mode shows a live
  "remaining" indicator until the per-person amounts sum to the total.
- The strip at the top of a group is **Settle Up** — the minimal set of
  payments ("Bob pays Carol Rs. 7,000.00") needed to zero everyone out. Each
  card has a **Settle** button that opens a payment modal, prefilled with
  the full suggested amount but editable for a partial payment. Confirming
  records a `Settlement` (who paid whom, how much, when) that immediately
  feeds back into balances and Settle Up — a partial payment leaves the
  remainder as a smaller suggested transaction.
- **Activity** below Settle Up is a single feed of everything that moved
  money in the group, newest first: expenses in a light amber card ("Edit" /
  "Delete"), settlements in a light green card ("Delete" only — a payment is
  a fact, not something you edit). Editing or deleting anything recalculates
  balances and Settle Up immediately.

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

Every participant gets `base`; the first `remainder` participants — in the
order they appear in `participantIds` — get one extra cent each. Example:
Rs. 100.00 split three ways → base = 3333, remainder = 1 → `[3334, 3333,
3333]`. This generalizes the spec's "give the leftover cent to the first
person" rule to any remainder size (e.g. splitting among 7 people can leave
up to 6 leftover cents), and the split always sums to exactly `totalCents`
by construction — verified in [`src/lib/money.test.ts`](src/lib/money.test.ts).

### Balances

`computeBalances(people, expenses, settlements)` in
[`src/lib/balances.ts`](src/lib/balances.ts) walks every expense once: the
payer's balance goes up by the full amount, and each participant's balance
goes down by their split share. A positive balance means the group owes
that person money; negative means they owe the group. Balances always sum
to exactly zero across a group, by construction.

A recorded `Settlement` (an actual payment from one person to another, via
the Settle Up button) folds in the same way but mirrored: the payer's
balance goes *up* by the amount paid, the receiver's goes *down* — exactly
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
an N-person tangle of debts into at most `N - 1` transactions — far fewer
than settling every pairwise debt individually. Verified against the
assignment's 4-person test scenario in
[`src/lib/settleUp.test.ts`](src/lib/settleUp.test.ts): balances
`Alice +566,667 / Bob -933,333 / Carol +700,000 / Dave -333,334` (cents)
simplify to exactly 3 transactions, and the amounts each person pays/receives
sum back to their original balance exactly.

## Tech stack

- **Next.js** (App Router) + TypeScript, single client page — no routing,
  no server, state lives in React + `localStorage`.
- **Tailwind CSS v4**, custom design tokens (color + type) in
  [`src/app/globals.css`](src/app/globals.css): the whole app renders as one
  centered, large-radius rounded panel floating on a muted warm backdrop
  (an Apple System-Settings-style "app window"), white bento cards inside on
  a warm parchment canvas, amber accent, and the system font stack
  (`-apple-system, BlinkMacSystemFont, "SF Pro Display/Text", …`) so Apple
  devices render real SF Pro and everything else gets a sane native fallback
  — deliberately not a look-alike webfont.
- **Vitest** for the algorithmic core (`src/lib/**/*.test.ts`).

### `useLocalStorage` and hydration

The hook always renders `initialValue` on the first pass (matching what the
server rendered, since the server never sees `localStorage`), then swaps in
the persisted value inside a `useEffect` after mount. Reading synchronously
in the state initializer instead would make the client's first paint
diverge from the server's and trigger a React hydration error — this was
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
npm run test    # vitest — money/balances/settle-up algorithms
npm run build   # production build + typecheck
npm run lint    # eslint
```
