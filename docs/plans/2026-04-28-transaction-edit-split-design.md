# Transaction Edit & Split Design

**Date:** 2026-04-28

## Overview

Two new features for the transactions table:
1. **Edit** — modify any field of an existing transaction via a modal form
2. **Split** — divide one transaction into N independent transactions, enabling the workflow of matching a single reimbursement payment to multiple individual expenses via the existing combine feature

## Edit Transaction

### Trigger
- Desktop: pencil icon appears on row hover in the actions column, alongside existing trash/combine icons
- Mobile: pencil button appears in the expanded action bar when a row is tapped

### Modal
- Pre-filled form with all editable fields: date, description, category, type, amount, account
- If type is `investment`, show ticker/shares/price_per_share fields (matching QuickAddForm pattern)
- Submit sends `PATCH /api/transactions/[id]`
- On success: modal closes, `router.refresh()`

### API
- New `PATCH` handler added to `/api/transactions/[id]/route.ts`
- `updateTransaction()` already exists in `src/db/queries/transactions.ts` — no DB changes needed

### Component
- New `EditTransactionModal.tsx` client component
- Opened via `editingId` state in `TransactionsTable`

## Split Transaction

### Use Case
User pays for multiple things on behalf of a friend group. Friends repay in one lump payment. User splits the repayment into pieces matching each individual expense, then uses the existing combine mode to group each piece with its corresponding expense.

### Trigger
- Desktop: scissors icon on row hover (only for non-grouped transactions)
- Mobile: scissors button in the expanded action bar (only for non-grouped transactions)

### Modal
- Header: read-only display of original transaction (description + amount)
- List of split rows — each row has: amount, description, category
- Type, date, and account are inherited from the original transaction
- Starts with 2 rows; first row pre-filled with full original amount, second with 0
- "Add row" button to add more splits
- Running total: `$X of $Y assigned` — green when equal, red when over/under
- Confirm button disabled until splits sum exactly to original amount

### API
- New `POST /api/transactions/[id]/split` route
- Request body: `{ splits: [{ amount, description, category }] }`
- Server validates sum equals original amount
- Deletes original transaction, inserts N new transactions with same date/type/account
- Returns new transaction IDs

### After Split
- `router.refresh()` returns user to table with new split rows visible
- User uses existing combine mode to pair splits with matching expenses

### Component
- New `SplitTransactionModal.tsx` client component
- Opened via `splittingId` state in `TransactionsTable`

## What's Not Changing
- DB schema: no migrations needed
- `updateTransaction()` query: already supports all fields
- Combine/ungroup feature: unchanged, split feeds into it naturally
- Transaction type definitions: unchanged
