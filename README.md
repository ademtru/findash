# Findash

A personal financial dashboard — clean, private, self-hosted on Vercel.

## Features

- Password-protected (only you can access it)
- Reads transaction and AI insight data from private Vercel Blob storage
- Never stores financial data in the git repo
- Responsive dark-mode UI — desktop sidebar, mobile bottom nav
- 5 pages: Overview, Transactions, Spending, Investments, AI Insights
- Update your data locally with Claude Code, push to Blob with one command

## Setup

### 1. Fork and clone

```bash
git clone https://github.com/yourusername/findash.git
cd findash
pnpm install
```

### 2. Generate your password hash

```bash
node -e "require('bcryptjs').hash('your-password-here', 12).then(console.log)"
```

Copy the output — this is your `PASSWORD_HASH`.

> **Important:** Bcrypt hashes contain `$` signs which `.env` files treat as variable expansions. Always wrap the value in **single quotes** in `.env.local`:
> ```
> PASSWORD_HASH='$2b$12$...'
> ```
> On Vercel, paste the raw hash value directly — Vercel's UI handles it correctly without quotes.

### 3. Set environment variables in Vercel

In your Vercel project dashboard → Settings → Environment Variables, add:

| Variable | Value |
|----------|-------|
| `PASSWORD_HASH` | The bcrypt hash from step 2 |
| `JWT_SECRET` | A random 32+ character string |
| `NEXT_PUBLIC_APP_URL` | Your Vercel deployment URL (e.g. `https://findash.vercel.app`) |
| `BLOB_READ_WRITE_TOKEN` | From Vercel Blob → your store → token |
| `BLOB_URL_TRANSACTIONS` | Set after step 4 |
| `BLOB_URL_INSIGHTS` | Set after step 5 |

### 4. Upload your transaction data

Edit `transactions.json` with your transactions (or ask Claude Code to populate it from your bank statements):

```bash
BLOB_READ_WRITE_TOKEN=your_token pnpm upload transactions.json
```

Copy the printed URL and set it as `BLOB_URL_TRANSACTIONS` in Vercel.

### 5. Upload AI insights

Ask Claude Code to generate `insights.json` from your transactions, then upload:

```bash
BLOB_READ_WRITE_TOKEN=your_token pnpm upload insights.json
```

Copy the URL and set it as `BLOB_URL_INSIGHTS` in Vercel.

### 6. Deploy

```bash
vercel deploy
```

## Updating your data

Whenever you want to update transactions or insights, repeat steps 4–5. The Vercel Blob URL stays the same (files are overwritten, not versioned).

## Transaction schema

```json
{
  "id": "unique-string",
  "date": "YYYY-MM-DD",
  "amount": -45.50,
  "type": "income | expense | transfer | investment",
  "category": "Food & Drink",
  "description": "Whole Foods",
  "account": "Checking",
  "ticker": "AAPL",
  "shares": 2.5,
  "price_per_share": 200.00
}
```

`amount` is negative for money out, positive for money in. `ticker`, `shares`, and `price_per_share` are only for `investment` type transactions.
