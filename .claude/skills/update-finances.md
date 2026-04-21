---
name: update-finances
description: Process bank statements, receipts, and screenshots shared in the chat to extract transactions, merge with existing data, generate AI insights, and upload via the Findash web API. Works from any device — no local setup required.
---

# Update Finances

You are updating the Findash financial dashboard with new financial data.

**Announce at start:** "Using update-finances skill to process your financial files."

---

## Step 1: Collect What You Need

You need two things before starting. Ask for anything not already provided in the user's message:

**Files to process** — the user should share them directly in the chat:
- Screenshots of banking apps or transactions (PNG/JPG)
- PDF bank or brokerage statements
- CSV exports from banks or brokers

**Dashboard credentials** (ask once, do not store):
> "What is your Findash dashboard URL and password?"

Expected: `APP_URL` (e.g. `https://findash.vercel.app`) and `FINDASH_PASSWORD`.

---

## Step 2: Authenticate and Load Existing Data

### Get a session cookie

```bash
curl -s -c /tmp/findash_session.txt \
  -X POST "$APP_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"password\": \"$FINDASH_PASSWORD\"}" > /dev/null
```

If this fails (non-2xx or empty cookie), stop and tell the user the URL or password is incorrect.

### Load existing transactions

```bash
curl -s -b /tmp/findash_session.txt "$APP_URL/api/transactions" > /tmp/existing_transactions.json
```

Parse the response. If it fails or returns empty, start with `{ "transactions": [] }`.

**Record all existing transaction IDs** — used for deduplication in Step 5.

### Load existing insights

```bash
curl -s -b /tmp/findash_session.txt "$APP_URL/api/insights" > /tmp/existing_insights.json
```

If it fails, start with `{ "generated_at": "", "monthly": [], "anomalies": [], "trends": [], "investments": [] }`.

**Read the existing insights carefully** — you will build on them in Step 6, preserving history for months not covered by this update.

---

## Step 3: Extract Transactions From Each Shared File

Process each file the user shared, one at a time. Use the Read tool to view images and PDFs.

### Images / screenshots
View the image. Extract every visible transaction row. Be thorough — include partially visible rows and scroll-cut edges.

### PDFs
Read the PDF with the Read tool. Extract all transaction rows from tables across all pages.

### CSV files
Read the file. Identify columns. Common formats:
- Chase: `Transaction Date, Post Date, Description, Category, Type, Amount, Memo`
- Bank of America: `Date, Description, Amount, Running Bal.`
- Fidelity: `Date, Transaction, Name, Memo/Description, Amount`
- Generic: look for date + description + amount columns

---

## Step 4: Transform to Transaction Schema

Every extracted transaction must match this structure exactly:

```ts
interface Transaction {
  id: string           // deterministic — see below
  date: string         // YYYY-MM-DD
  amount: number       // negative = outflow, positive = inflow
  type: 'income' | 'expense' | 'transfer' | 'investment'
  category: string
  description: string  // cleaned merchant/payee name
  account: string      // e.g. "Chase Checking" — infer from source
  ticker?: string      // investment transactions only
  shares?: number
  price_per_share?: number
}
```

### ID (deterministic — prevents re-import duplicates)
```
id = "{YYYY-MM-DD}-{abs(amount).toFixed(2)}-{slug(description)}"
```
`slug` = first 20 chars of description, lowercased, spaces→hyphens, non-alphanumeric removed.
Example: `"2025-03-15-200.00-apple-store"`

### Amount signs
- **Positive**: money in — salary, refunds, interest, transfers received
- **Negative**: money out — purchases, bills, investments, transfers sent

### Type

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

---

## Step 5: Deduplicate and Merge Transactions

1. Filter out any new transaction whose `id` already exists in the existing dataset
2. Report: "Found X new transactions (Y duplicates skipped)"
3. Append new transactions to the existing list, sorted by `date` descending

Write the merged result:

```bash
cat > /tmp/transactions.json << 'ENDJSON'
{
  "transactions": [ ...full merged list, newest first... ]
}
ENDJSON
```

Validate: well-formed JSON, all fields present, amounts are numbers, dates are YYYY-MM-DD.

---

## Step 6: Generate AI Insights

Use the **complete** merged transaction dataset. Build on the existing insights from Step 2 — only update what changed.

### Which months to update
Identify all `YYYY-MM` months that contain **newly added** transactions. These are **affected months**. All other months are **preserved** (copy existing insight unchanged).

### Monthly insights (affected months only)
```ts
{
  month: "YYYY-MM",
  narrative: "2-3 sentence summary of that month's finances",
  savings_rate: (totalIncome - totalExpenses) / totalIncome,
  highlights: ["2-4 notable facts"]
}
```
`totalIncome` = sum of `income` transactions · `totalExpenses` = sum of absolute `expense` values

For **preserved months**, copy the existing entry word-for-word.

### Anomalies (new transactions only)
Only flag anomalies in **newly imported** transactions. Existing anomalies are preserved by the upload API.

Consider: transaction >3× category average, unusual income spike/drop, near-duplicate transactions same week, month with zero income.

```ts
{
  date: "YYYY-MM-DD",
  description: "What is unusual and why it matters — be specific",
  severity: "low" | "medium" | "high"
}
```

### Trends (full dataset — always refresh)
3–6 meaningful patterns across all data:
```ts
{
  type: "short label",
  description: "1-2 sentences with specific numbers",
  direction: "positive" | "negative" | "neutral"
}
```

### Investment commentary (affected tickers only)
Update commentary only for tickers in newly added transactions. Copy existing commentary for all others.
```ts
{ ticker: "AAPL", commentary: "1-2 sentences on cost basis, frequency, pattern" }
```

---

## Step 7: Write insights.json

```bash
cat > /tmp/insights.json << 'ENDJSON'
{
  "generated_at": "<ISO 8601 timestamp of now>",
  "monthly":     [ ...all months, oldest→newest... ],
  "anomalies":   [ ...existing + new, severity desc then date desc... ],
  "trends":      [ ...fresh full-dataset trends... ],
  "investments": [ ...all tickers, total cost desc... ]
}
ENDJSON
```

---

## Step 8: Upload Both Files

```bash
# Upload transactions
echo "Uploading transactions..."
curl -s -b /tmp/findash_session.txt \
  -X POST "$APP_URL/api/transactions/upload" \
  -F "file=@/tmp/transactions.json"

echo ""

# Upload insights
echo "Uploading insights..."
curl -s -b /tmp/findash_session.txt \
  -X POST "$APP_URL/api/transactions/upload" \
  -F "file=@/tmp/insights.json"
```

Both endpoints return JSON — show the results to the user.

```bash
# Clean up
rm -f /tmp/findash_session.txt /tmp/existing_transactions.json /tmp/existing_insights.json
```

---

## Step 9: Confirm

Report:
- **Transactions**: count before → after, new added, duplicates skipped, date range covered
- **Insights**: months updated, months preserved, new anomalies flagged, tickers updated
- Dashboard URL so the user can open it: `$APP_URL`

---

## Error Handling

| Problem | Action |
|---------|--------|
| Login fails | Ask user to check URL and password |
| Can't read a file | Skip it, tell user, continue with others |
| Ambiguous CSV format | Ask user to clarify one example row |
| Upload returns error | Show the error message; the local files are at `/tmp/transactions.json` and `/tmp/insights.json` — user can upload manually via the `/upload` page |
| Date can't be parsed | Skip that row and report it |
| Existing data fetch returns empty | Warn user, proceed with empty baseline |

---

## Privacy Note

Financial data is processed within this session only. It is written to your own Vercel Blob storage via your dashboard's upload API — nothing is sent to third parties.
