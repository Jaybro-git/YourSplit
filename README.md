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

A follow-up pass added multi-group support (create named groups, each with
its own members and expense log) and a full visual redesign: bento-box
layout, light theme, white-and-amber palette, modal-driven "+" actions
instead of tabs.

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
  payments ("Bob pays Carol Rs. 7,000.00") needed to zero everyone out.
  Editing or deleting an expense recalculates all of this immediately.

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

`computeBalances(people, expenses)` in
[`src/lib/balances.ts`](src/lib/balances.ts) walks every expense once: the
payer's balance goes up by the full amount, and each participant's balance
goes down by their split share. A positive balance means the group owes
that person money; negative means they owe the group. Balances always sum
to exactly zero across a group, by construction.

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
  [`src/app/globals.css`](src/app/globals.css): warm parchment background,
  white bento cards, amber accent, `Fraunces` (display) + `Manrope` (body).
- **Vitest** for the algorithmic core (`src/lib/**/*.test.ts`).

## Project structure

```
src/
  types/index.ts        Person, Group, Expense, ExpenseSplit, Transaction
  hooks/useLocalStorage.ts
  lib/
    money.ts             toCents, formatCurrency, splitEqually, sumSplits
    balances.ts          computeBalances
    settleUp.ts          simplifyDebts (greedy)
    id.ts                generateId, timestampNow
  components/
    GroupCard.tsx, GroupDetail.tsx   home grid card / group screen
    SettleUpStrip.tsx                 debt summary strip
    MembersPanel.tsx                  members modal (add/remove/balances)
    ExpenseForm.tsx, ExpenseList.tsx  log + edit/delete expenses
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
