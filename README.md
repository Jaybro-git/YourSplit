# YourSplit

**Shared expenses, settled fairly.** YourSplit tracks who paid for what across a
group, keeps everyone's net balance live, and reduces the tangle down to the
smallest possible set of payments needed to make everyone even.

Built on Next.js 16 + Supabase Postgres, with Google sign-in and shareable
invite links, so a group is a real shared space — not a list trapped in one
browser.

---

## Why YourSplit

Splitting a trip, a flat, or a dinner usually ends in a spreadsheet nobody
trusts. YourSplit solves the three parts that actually go wrong:

| Problem | How YourSplit handles it |
| --- | --- |
| Rounding drift on uneven splits | All money is integer cents end to end. An equal split always sums to *exactly* the total, and you choose who absorbs the leftover cent. |
| "Who pays who?" chaos | Greedy debt simplification collapses an N-person web of debts into at most N−1 transfers. |
| Half-paid debts | Settlements are recorded as real payments, full or partial, and feed straight back into balances. |

---

## Features

### Groups and people

- **Multi-group workspace.** Home is a grid of group cards, each with its own
  hashed accent colour, live balance, and member avatars.
- **Google sign-in.** Every group is tied to accounts, so it follows you across
  devices and browsers.
- **Invite links.** Generate a link, share it anywhere; it expires in 7 days.
- **Ghost members.** Add someone by name before they have an account. When they
  join via the invite link, they claim that member row and inherit its entire
  history — no re-entry, no duplicate person.
- **Leave vs. delete.** Leaving unlinks your account but preserves the group's
  history for everyone else, and hands ownership to the longest-standing member.
  Deleting is owner-only and blocked until the group is fully settled.

### Expenses

- **Rich entry.** Description, amount, payer, participants, date (back-datable),
  a **category** (food, transport, accommodation, and 7 more, each with an icon),
  and an optional one-line note.
- **Two split methods.** *Equal*, with a live per-person preview, or *Exact*,
  with a running "remaining" indicator until the parts sum to the total.
- **You control the rounding.** Drag participants to reorder them — leftover
  cents go to whoever is first, and the preview tags them with `(+1¢)`.
- **Edit, delete, undo.** Every destructive action surfaces an Undo toast.
  Balances and settle-up recalculate instantly.

### Balances and settling

- **Personal stat tiles.** You paid / you're owed / you owe / total spent, framed
  from the signed-in member's perspective.
- **Minimal transfer list.** "Bob pays Carol Rs. 7,000.00" — the shortest route
  to zero, recomputed on every change.
- **Partial settlements.** Hit **Settle**, adjust the prefilled amount down, and
  the remainder rolls forward as the next suggested transfer.
- **Activity feed.** One chronological stream of expenses and settlements, each
  colour-coded, with its date and category.
- **Export PDF.** One click renders a print-optimised group summary — balances,
  suggested transfers, and full history — always in light theme regardless of
  the on-screen mode.

### Interface

- Responsive from phone to desktop: dialogs become drawers on small screens, with
  a fixed bottom action bar.
- Light, dark, and system themes.
- Optimistic mutations with rollback — the UI responds instantly and reverts with
  a toast if the write fails.

---

## Getting started

### Prerequisites

- Node.js 20+
- A Supabase project
- A Google Cloud OAuth client (for the Supabase Google provider)

### Setup

1. **Enable Google auth** in your Supabase project under
   **Authentication → Providers**.
2. **Run the migrations** in `supabase/migrations/`, in order, in the Supabase
   SQL Editor. They create the schema, RLS policies, and the RPCs the app
   depends on (`create_group`, `accept_invite`, `claim_ghost_member`,
   `get_invite_preview`, `leave_group`).
3. **Configure the environment:** copy `.env.example` to `.env.local` and fill
   in your project URL and anon key.

```bash
npm install
npm run dev     # http://localhost:3000
npm run test    # vitest: money / balances / settle-up — pure, no env needed
npm run build   # production build + typecheck
npm run lint    # eslint
```

> `dev` and `build` both require `.env.local`. Without it, the build fails while
> prerendering with `@supabase/ssr: Your project's URL and API key are required
> to create a Supabase client!` — the root layout constructs a client, so the
> error surfaces on a static page like `/_not-found` rather than anywhere
> obviously auth-related.

---

## How the math works

### Money as integer cents

Amounts are converted to integer cents at the form boundary (`toCents` in
[`src/lib/money.ts`](src/lib/money.ts)) and stored as integers on
`Expense.totalCents` / `ExpenseSplit.amountCents`. Every calculation operates on
integers; cents are divided back to rupees only for display. No binary
floating-point drift is possible.

### Remainder distribution (the "penny drop")

`splitEqually(totalCents, participantIds)` divides a total evenly and still lands
on an exact integer number of cents per person:

```
base      = floor(totalCents / n)
remainder = totalCents - base * n        // 0 <= remainder < n
```

Everyone gets `base`; the first `remainder` participants, in list order, get one
extra cent each. Rs. 100.00 three ways → `[3334, 3333, 3333]`. The split sums to
exactly `totalCents` by construction, verified in
[`src/lib/money.test.ts`](src/lib/money.test.ts). Because the rule keys off list
order, drag-to-reorder in the expense form is a real control over who absorbs the
rounding.

### Balances

`computeBalances(people, expenses, settlements)` in
[`src/lib/balances.ts`](src/lib/balances.ts) walks each expense once: the payer's
balance rises by the full amount, each participant's falls by their share.
Positive means the group owes that person; negative means they owe the group.
Balances always sum to exactly zero.

A recorded `Settlement` folds in mirrored — payer up, receiver down — undoing
exactly that much debt. A full settlement zeroes the pair; a partial one shrinks
what remains, and the next render reflects it automatically.

### Debt simplification

`simplifyDebts(balances)` in [`src/lib/settleUp.ts`](src/lib/settleUp.ts) turns
net balances into a minimised transfer list:

1. Split people into creditors (balance > 0) and debtors (balance < 0).
2. Repeatedly pair the largest creditor with the largest debtor and settle the
   smaller of the two amounts as one transaction.
3. Whichever side hits zero drops out; the other carries its remainder forward.
   Repeat until both lists are empty.

This is the standard greedy approach, collapsing an N-person tangle into at most
`N − 1` transactions. Verified in
[`src/lib/settleUp.test.ts`](src/lib/settleUp.test.ts): balances
`Alice +566,667 / Bob −933,333 / Carol +700,000 / Dave −333,334` (cents) simplify
to exactly 3 transactions, with each person's payments summing back to their
original balance.

---

## Architecture

### Stack

- **Next.js 16** (App Router) + **React 19** + TypeScript
- **Supabase** Postgres, Auth (Google OAuth), and row-level security
- **Tailwind CSS v4** with shadcn/ui primitives (Radix), `motion` for animation,
  `sonner` for toasts, `vaul` for mobile drawers, `next-themes` for theming
- **Vitest** over the pure algorithmic core

### Data model

Balances and settle-up are computed client-side from pure, database-agnostic
functions over `Group { people, expenses, settlements }`. Postgres is the source
of truth; the algorithms never touch it.

Access control lives entirely in RLS. One `GROUP_SELECT` query pulls groups with
their members, profiles, expenses, and settlements nested — RLS filters it to
exactly what the caller may see, so no separate authorization layer is needed in
the client.

Foreign keys from `expenses.paid_by` and `settlements.from/to_member_id` to
`group_members` are `ON DELETE RESTRICT` on purpose: removing a member who
appears in an expense would silently corrupt everyone's balances. Members with
history are unlinked into ghosts rather than deleted.

### Project structure

```
src/
  types/index.ts            Person, Group, Expense, ExpenseSplit, Settlement, Transaction
  lib/
    money.ts                toCents, formatCurrency, splitEqually, sumSplits
    balances.ts             computeBalances — pure, DB-agnostic
    settleUp.ts             simplifyDebts (greedy)
    categories.ts           expense categories + icon/label metadata
    palette.ts              deterministic per-person colour hashing
    safeNext.ts             open-redirect-safe post-auth return paths
    supabase/
      client.ts             browser client
      server.ts             server-component / route-handler client
      proxy.ts              session refresh + auth redirect
      mappers.ts            DB rows -> Person/Group/Expense/Settlement
      database.types.ts     types matching supabase/migrations/
  store/
    auth.tsx                AuthProvider/useAuth — session + profile
    groups.tsx              GroupsProvider/useGroups — Postgres-backed, optimistic
  components/
    GroupCard.tsx GroupDetail.tsx GroupHeader.tsx    home grid / group screen
    SettleUpStrip.tsx SettleUpModal.tsx              transfers + record-a-payment
    ActivityFeed.tsx BalanceOverview.tsx StatTile.tsx
    ExpenseForm.tsx ExpenseFormDialog.tsx ExpenseScreen.tsx ExpenseDetail.tsx
    MembersPanel.tsx AddMemberDialog.tsx AvatarBadge.tsx
    InviteDialog.tsx JoinGroupCard.tsx               invite + ghost claim
    GroupSummaryPrint.tsx                            print/PDF summary
    ui/ ui-ext/ layout/                              shadcn primitives, AppShell
  app/
    login/page.tsx          Google sign-in
    auth/callback/route.ts  OAuth code exchange
    join/[token]/page.tsx   invite acceptance
    (app)/page.tsx          groups list
    (app)/g/[id]/page.tsx   group detail
  proxy.ts                  session refresh + route protection
supabase/migrations/        schema, RLS policies, RPCs
```

> `src/proxy.ts` (Next 16's renamed `middleware.ts`) must sit beside `src/app/`.
> In a `src/`-directory project a root-level `proxy.ts` is silently ignored — no
> warning, no build error; protected routes just serve as though you were signed
> in.