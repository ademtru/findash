---
name: update-finances
description: Process bank statements, receipts, and screenshots to extract transactions, merge with existing data, generate AI insights, and upload everything via the Findash web API or Vercel Blob.
---

# Update Finances

You are updating the Findash financial dashboard with new financial data.

## Overview

This skill processes uploaded financial files (bank statements, CSVs, screenshots, PDFs), extracts transactions, merges with existing data, generates AI insights that build on previous history, and uploads both files.

**Announce at start:** "Using update-finances skill to process your financial files."

---

## Step 1: Collect Files to Process

If the user has not provided file paths, ask:

> "Which files do you want to process? Provide full paths or drag files into the terminal. Supported: bank statement CSVs, PDF statements, screenshots of transactions."

Accept any combination of:
- **CSV/Excel** — bank exports, brokerage exports
- **PDF** — bank statements, investment reports
- **Images** (PNG/JPG/HEIC) — screenshots of banking apps, receipts, brokerage screens

---

## Step 2: Resolve Project Root and Config

```bash
PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
ENV_FILE="$PROJECT_ROOT/.env.local"
```

Read the env file and extract these values:

```bash
BLOB_URL_TRANSACTIONS=$(grep -E '^BLOB_URL_TRANSACTIONS=' "$ENV_FILE" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'")
BLOB_URL_INSIGHTS=$(grep -E '^BLOB_URL_INSIGHTS=' "$ENV_FILE" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'")
APP_URL=$(grep -E '^NEXT_PUBLIC_APP_URL=' "$ENV_FILE" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'")
BLOB_TOKEN=$(grep -E '^BLOB_READ_WRITE_TOKEN=' "$ENV_FILE" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'")
FINDASH_PASSWORD=$(grep -E '^FINDASH_PASSWORD=' "$ENV_FILE" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'")
```

Determine the upload method:
- **Web API** (preferred): requires `APP_URL` and `FINDASH_PASSWORD`
- **Direct blob** (fallback): requires `BLOB_READ_WRITE_TOKEN`

If neither is available, tell the user to add one of the following to `.env.local`:
```
# Option A — web API (recommended, works from anywhere)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
FINDASH_PASSWORD=your_dashboard_password

# Option B — direct blob upload (requires token)
BLOB_READ_WRITE_TOKEN=vercel_blob_...
```

---

## Step 3: Load Existing Transactions

Fetch the current transaction dataset for full-history analysis:

```bash
curl -s "$BLOB_URL_TRANSACTIONS" > /tmp/existing_transactions.json
```

If fetch fails or `BLOB_URL_TRANSACTIONS` is not set, start with `{ "transactions": [] }`.

**Record all existing transaction IDs** — you will use these to skip duplicates in Step 6.

---

## Step 4: Load Existing Insights

Fetch current insights so you can build on them rather than starting from scratch:

```bash
curl -s "$BLOB_URL_INSIGHTS" > /tmp/existing_insights.json
```

If fetch fails or `BLOB_URL_INSIGHTS` is not set, start with:
```json
{ "generated_at": "", "monthly": [], "anomalies": [], "trends": [], "investments": [] }
```

**Read the existing insights carefully.** You will preserve monthly summaries for unchanged months, carry forward investment commentary for untouched tickers, and append only genuinely new anomalies.

---

## Step 5: Extract Transactions From Each File

Process each provided file one at a time:

### CSV files
Read the file. Identify columns. Common formats:
- Chase: `Transaction Date, Post Date, Description, Category, Type, Amount, Memo`
- Bank of America: `Date, Description, Amount, Running Bal.`
- Fidelity: `Date, Transaction, Name, Memo/Description, Amount`
- Generic: find date + description + amount columns

### PDF files
Read the PDF with the Read tool. Extract every transaction row from tables (handle multi-page).

### Image/screenshot files
View the image with the Read tool. Extract every visible transaction — be thorough, including partially visible rows.

---

## Step 6: Transform and Deduplicate

### Transaction schema

Every extracted transaction must conform to:

```ts
interface Transaction {
  id: string           // deterministic — see ID generation below
  date: string         // YYYY-MM-DD
  amount: number       // negative = outflow, positive = inflow
  type: 'income' | 'expense' | 'transfer' | 'investment'
  category: string
  description: string  // cleaned merchant/payee name
  account: string      // e.g. "Chase Checking" — infer from source file
  ticker?: string      // investment transactions only
  shares?: number
  price_per_share?: number
}
```

### ID generation (deterministic — prevents re-import duplicates)

```
id = "{YYYY-MM-DD}-{abs(amount).toFixed(2)}-{slug(description)}"
```

`slug` = first 20 chars, lowercased, spaces→hyphens, non-alphanumeric removed.
Example: `"2025-03-15-200.00-apple-store"`

### Amount sign convention
- **Positive**: money in — salary, refunds, interest, transfers received
- **Negative**: money out — purchases, bills, investments, transfers sent

### Type classification

| type | When to use |
|------|-------------|
| `income` | Salary, freelance, tax refund, interest, dividends |
| `expense` | Any purchase, bill, subscription, fee |
| `transfer` | Between your own accounts |
| `investment` | Stock/ETF/crypto buy or sell, brokerage contributions |

### Categories

**Expenses:** `Food & Drink`, `Groceries`, `Transport`, `Fuel`, `Utilities`, `Rent/Mortgage`, `Healthcare`, `Insurance`, `Subscriptions`, `Shopping`, `Entertainment`, `Travel`, `Education`, `Personal Care`, `Home`, `Fees & Charges`, `Other`

**Income:** `Salary`, `Freelance`, `Interest`, `Dividends`, `Tax Refund`, `Other Income`

**Investment / Transfer:** `Investment`, `Transfer`

### Deduplication

Filter out any new transaction whose `id` already exists in the existing dataset. Report: "Found X new transactions (Y duplicates skipped)."

### Merge

Append the new (non-duplicate) transactions to the existing list and sort by `date` descending.

---

## Step 7: Write transactions.json

```json
{
  "transactions": [ ...full merged list, newest first... ]
}
```

File: `$PROJECT_ROOT/transactions.json`

Validate: well-formed JSON, all fields present, amounts are numbers, dates are YYYY-MM-DD.

---

## Step 8: Generate AI Insights

Analyze the **complete** merged transaction dataset. Use the existing insights loaded in Step 4 as your baseline — the goal is incremental updates, not a full regeneration.

### Which months to update

Identify all months (`YYYY-MM`) that contain newly added transactions. These are the **affected months**. All other months are **preserved** (copy their existing insight unchanged).

### Monthly insights (affected months only)

For each affected month, generate:
```ts
{
  month: "YYYY-MM",
  narrative: "2-3 sentence summary of that month's finances",
  savings_rate: (totalIncome - totalExpenses) / totalIncome,  // negative if expenses > income
  highlights: ["2-4 notable facts or events"]
}
```

Where `totalIncome` = sum of positive `income` transactions, `totalExpenses` = sum of absolute values of `expense` transactions.

For preserved months, copy the existing entry unchanged.

### Anomalies (new transactions only)

Only flag anomalies **in the newly imported transactions**. Existing anomalies are preserved automatically by the upload API.

Consider:
- A transaction >3× the category average
- Unusual income spike or drop vs. surrounding months
- Duplicate-looking transactions (same amount, same merchant, within one week)
- A month with zero income (possible missing data)

```ts
{
  date: "YYYY-MM-DD",
  description: "What is unusual and why it matters — be specific",
  severity: "low" | "medium" | "high"
}
```

`high` = potential fraud or major event · `medium` = unusual but likely fine · `low` = minor observation

### Trends (full dataset — always refresh)

Analyze the complete dataset for 3–6 meaningful patterns:
```ts
{
  type: "short label",
  description: "1-2 sentences with specific numbers",
  direction: "positive" | "negative" | "neutral"
}
```

Examples: spending rising MoM in a category, savings rate improving, a recurring charge the user may have forgotten.

### Investment commentary (affected tickers only)

For each ticker that appears in the **newly added** transactions, write or update commentary. For tickers not in this update, copy existing commentary unchanged.

```ts
{
  ticker: "AAPL",
  commentary: "1-2 sentences on cost basis, purchase frequency, or observed pattern"
}
```

---

## Step 9: Write insights.json

Produce the complete merged insights file:

```json
{
  "generated_at": "<ISO 8601 timestamp>",
  "monthly":     [ ...all months (preserved + updated), sorted oldest→newest... ],
  "anomalies":   [ ...existing + new, sorted severity desc then date desc... ],
  "trends":      [ ...fresh full-dataset trends, most impactful first... ],
  "investments": [ ...all tickers (preserved + updated), sorted by total cost desc... ]
}
```

File: `$PROJECT_ROOT/insights.json`

---

## Step 10: Upload Both Files

### Option A — Web API (preferred, works from anywhere, no token needed)

```bash
# 1. Authenticate — get a session cookie
curl -s -c /tmp/findash_session.txt \
  -X POST "$APP_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"password\": \"$FINDASH_PASSWORD\"}" > /dev/null

# 2. Upload transactions
echo "Uploading transactions..."
curl -s -b /tmp/findash_session.txt \
  -X POST "$APP_URL/api/transactions/upload" \
  -F "file=@$PROJECT_ROOT/transactions.json"

# 3. Upload insights
echo "Uploading insights..."
curl -s -b /tmp/findash_session.txt \
  -X POST "$APP_URL/api/transactions/upload" \
  -F "file=@$PROJECT_ROOT/insights.json"

# 4. Clean up
rm -f /tmp/findash_session.txt
```

The API returns JSON with merge results for each upload — show them to the user.

### Option B — Direct blob upload (fallback, requires BLOB_READ_WRITE_TOKEN)

```bash
cd "$PROJECT_ROOT"
pnpm upload transactions.json
pnpm upload insights.json
```

If this prints new blob URLs (first-time upload), tell the user:
> "Add these to your Vercel environment variables — you only need to do this once:
> `BLOB_URL_TRANSACTIONS=<url>`
> `BLOB_URL_INSIGHTS=<url>`"

---

## Step 11: Confirm

Report a summary:
- Transactions: count before → after, new added, duplicates skipped, date range
- Insights: months updated, months preserved, new anomalies flagged
- Any action the user should take (e.g. set new env vars)

---

## Error Handling

| Problem | Action |
|---------|--------|
| Can't read a file | Skip it, tell user, continue with others |
| Ambiguous CSV format | Ask user to clarify one example row |
| Auth fails (Option A) | Check `FINDASH_PASSWORD` in `.env.local`; fall back to Option B |
| Upload fails | Files are saved locally — user can upload manually via the dashboard `/upload` page or `pnpm upload` |
| Date can't be parsed | Skip that row and report it |
| Existing data fetch fails | Warn user, proceed with empty baseline |

---

## Privacy Note

All processing happens locally in this Claude Code session. Financial data is only written to your own Vercel Blob storage — nothing is sent to third parties.
