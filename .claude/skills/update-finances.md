---
name: update-finances
description: Process bank statements, receipts, and screenshots to extract transactions, merge with existing data, generate AI insights, and upload everything to Vercel Blob.
---

# Update Finances

You are updating the Findash financial dashboard with new transaction data.

## Overview

This skill processes uploaded financial files (bank statements, CSVs, screenshots, PDFs), extracts transactions, merges them with existing data, generates AI insights, and uploads both JSON files to Vercel Blob.

**Announce at start:** "Using update-finances skill to process your financial files."

---

## Step 1: Collect Files to Process

If the user has not provided file paths in their message, ask:

> "Which files do you want to process? Provide the full paths (or drag files into the terminal). Supported: bank statement CSVs, PDF statements, screenshots of transactions."

Accept any combination of:
- **CSV/Excel** — bank exports, brokerage exports
- **PDF** — bank statements, investment reports
- **Images** (PNG/JPG/HEIC) — screenshots of banking apps, receipts, brokerage screens

---

## Step 2: Load Existing Transactions

Fetch current data from Vercel Blob:

```bash
# Check .env.local for BLOB_URL_TRANSACTIONS
grep BLOB_URL_TRANSACTIONS /Users/adems/projects/findash/.env.local
```

If `BLOB_URL_TRANSACTIONS` is set and non-empty:
```bash
curl -s "$BLOB_URL_TRANSACTIONS" > /tmp/existing_transactions.json
```

If the URL is not set or fetch fails, start with an empty dataset:
```json
{ "transactions": [] }
```

Read and remember the existing transaction IDs to enable deduplication later.

---

## Step 3: Extract Transactions From Each File

Process each file one at a time. For each file:

### For CSV files
Use the Read tool (or Bash `cat`) to read the file contents. Identify the columns. Common bank CSV formats:
- Chase: `Transaction Date, Post Date, Description, Category, Type, Amount, Memo`
- Bank of America: `Date, Description, Amount, Running Bal.`
- Fidelity/brokerage: `Date, Transaction, Name, Memo/Description, Amount`
- Generic: look for date, description, amount columns

Parse every row into the transaction schema below.

### For PDF files
Use the Read tool to read the PDF. Extract all transaction rows — look for tables with date, description, and amount columns. Handle multi-page statements.

### For image/screenshot files
Use the Read tool to view the image visually. Extract every visible transaction from the screen. Be thorough — get all rows, even partially visible ones.

---

## Step 4: Transform to Transaction Schema

Every extracted transaction **must** conform to this TypeScript type:

```ts
interface Transaction {
  id: string           // deterministic, see ID generation below
  date: string         // YYYY-MM-DD (convert MM/DD/YYYY, DD/MM/YYYY, etc.)
  amount: number       // NEGATIVE for outflows (expenses, investments, transfers out)
                       // POSITIVE for inflows (income, transfers in)
  type: 'income' | 'expense' | 'transfer' | 'investment'
  category: string     // see category guide below
  description: string  // cleaned merchant/payee name
  account: string      // e.g. "Chase Checking", "Fidelity Brokerage" — infer from source file
  ticker?: string      // only for investment transactions, e.g. "AAPL"
  shares?: number      // only for investment transactions
  price_per_share?: number  // only for investment transactions, if available
}
```

### ID Generation

Generate IDs deterministically so re-importing the same file doesn't create duplicates:

```
id = "{YYYY-MM-DD}-{abs(amount).toFixed(2)}-{slug(description)}"
```

Where `slug(description)` = first 20 chars of description, lowercased, spaces→hyphens, non-alphanumeric→removed.

Example: `"2025-03-15-200.00-apple-store"` or `"2025-03-01-5000.00-payroll-direct-dep"`

### Amount Sign Convention

- **Positive (+)**: money coming in — salary, refunds, interest, dividends, transfers received
- **Negative (-)**: money going out — purchases, bills, investments, transfers sent

Many bank CSVs use negative for purchases — preserve that. Some use positive for everything and have a separate debit/credit column — apply the sign yourself.

### Type Classification

| type | When to use |
|------|-------------|
| `income` | Salary, freelance pay, tax refund, interest, dividends received |
| `expense` | Any purchase, bill, subscription, fee |
| `transfer` | Between your own accounts (checking→savings, etc.) |
| `investment` | Stock/ETF/crypto buy or sell, brokerage contributions |

### Category Guide

Use these categories consistently:

**Expenses:** `Food & Drink`, `Groceries`, `Transport`, `Fuel`, `Utilities`, `Rent/Mortgage`, `Healthcare`, `Insurance`, `Subscriptions`, `Shopping`, `Entertainment`, `Travel`, `Education`, `Personal Care`, `Home`, `Fees & Charges`, `Other`

**Income:** `Salary`, `Freelance`, `Interest`, `Dividends`, `Tax Refund`, `Other Income`

**Investment:** `Investment`

**Transfer:** `Transfer`

---

## Step 5: Deduplicate and Merge

1. Collect all newly extracted transactions
2. Load existing transaction IDs (from Step 2)
3. Filter out any new transaction whose ID already exists in the current data
4. Append the non-duplicate new transactions to the existing list
5. Sort the full list by `date` descending (newest first)

Report: "Found X new transactions (Y duplicates skipped)."

---

## Step 6: Write transactions.json

Write the merged data to the project root:

```json
{
  "transactions": [ ...all transactions sorted newest first... ]
}
```

File path: `/Users/adems/projects/findash/transactions.json`

Validate: the JSON is well-formed, all required fields are present, all amounts are numbers (not strings), all dates are YYYY-MM-DD.

---

## Step 7: Generate AI Insights

Analyze the full transaction dataset and produce insights. Think carefully — this is a personal finance AI assistant giving the user useful, specific observations.

### Monthly Insights

For each month that has transactions, generate:
```ts
{
  month: "YYYY-MM",
  narrative: "2-3 sentence plain-English summary of that month's finances",
  savings_rate: 0.0–1.0,  // (income - expenses) / income. Negative if expenses > income.
  highlights: ["string1", "string2", ...]  // 2-4 notable events or facts for that month
}
```

Savings rate formula: `(totalIncome - totalExpenses) / totalIncome` where:
- `totalIncome` = sum of all `income` type transactions (positive)
- `totalExpenses` = sum of absolute values of all `expense` type transactions

### Anomalies

Flag unusual transactions. Consider:
- Single transaction that is >3x the average for its category
- Unusually large income spike or drop vs. previous months
- Duplicate-looking transactions (same amount, same merchant, same week)
- A month with zero income (likely missing data — flag it)

```ts
{
  date: "YYYY-MM-DD",
  description: "Clear explanation of what's unusual and why it matters",
  severity: "low" | "medium" | "high"
}
```

Severity guide: `high` = potential fraud or major financial event, `medium` = unusual but probably fine, `low` = minor observation.

### Trends

Identify 3-6 meaningful trends across the dataset:
```ts
{
  type: "short label",
  description: "1-2 sentence observation with specific numbers",
  direction: "positive" | "negative" | "neutral"
}
```

Examples: spending increasing month-over-month in a category, savings rate improving, investment contributions growing, a recurring subscription they might not know is still active.

`positive` = good for finances, `negative` = concerning, `neutral` = informational.

### Investment Insights

For each unique ticker in investment transactions:
```ts
{
  ticker: "AAPL",
  commentary: "1-2 sentences about cost basis, frequency of purchases, or pattern observed"
}
```

---

## Step 8: Write insights.json

```json
{
  "generated_at": "ISO 8601 timestamp of now",
  "monthly": [ ...monthly insights sorted oldest first... ],
  "anomalies": [ ...sorted by severity desc, then date desc... ],
  "trends": [ ...most impactful first... ],
  "investments": [ ...sorted by total cost desc... ]
}
```

File path: `/Users/adems/projects/findash/insights.json`

---

## Step 9: Upload to Vercel Blob

```bash
cd /Users/adems/projects/findash
pnpm upload transactions.json
pnpm upload insights.json
```

These commands run `tsx scripts/upload-data.ts` — they require `BLOB_READ_WRITE_TOKEN` in `.env.local`.

If the upload prints new URLs (first-time upload), remind the user:
> "First-time upload — copy these URLs into your Vercel environment variables as `BLOB_URL_TRANSACTIONS` and `BLOB_URL_INSIGHTS`. You only need to do this once; subsequent uploads to the same filename keep the same URL."

---

## Step 10: Confirm

Report a summary:
- Total transactions in dataset (before and after)
- New transactions added
- Date range covered
- Months covered in insights
- Any anomalies flagged

---

## Error Handling

| Problem | Action |
|---------|--------|
| Can't read a file | Tell the user and skip that file; continue with others |
| Ambiguous column format | Ask the user to clarify one example row |
| Missing BLOB_READ_WRITE_TOKEN | Tell user to add it to `.env.local` and re-run |
| Upload fails | The JSON files are saved locally — tell user to run `pnpm upload` manually |
| Date can't be parsed | Skip that row and report it |

---

## Privacy Note

All processing happens locally in this Claude Code session. Financial data is read only to populate the JSON files — it is never sent anywhere except to your own Vercel Blob storage via the upload script.
