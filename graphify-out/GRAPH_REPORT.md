# Graph Report - .  (2026-04-28)

## Corpus Check
- Corpus is ~42,903 words - fits in a single context window. You may not need a graph.

## Summary
- 346 nodes · 388 edges · 22 communities detected
- Extraction: 73% EXTRACTED · 27% INFERRED · 0% AMBIGUOUS · INFERRED: 104 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Investment & Prices|Investment & Prices]]
- [[_COMMUNITY_Navigation & Layout|Navigation & Layout]]
- [[_COMMUNITY_Transaction Add Form|Transaction Add Form]]
- [[_COMMUNITY_Page Loading Skeletons|Page Loading Skeletons]]
- [[_COMMUNITY_Holdings Display|Holdings Display]]
- [[_COMMUNITY_Auth & Middleware|Auth & Middleware]]
- [[_COMMUNITY_AI Extraction Pipeline|AI Extraction Pipeline]]
- [[_COMMUNITY_Budget Management|Budget Management]]
- [[_COMMUNITY_Database Queries|Database Queries]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]

## God Nodes (most connected - your core abstractions)
1. `POST()` - 37 edges
2. `GET()` - 26 edges
3. `generateInsightForPeriod()` - 15 edges
4. `DELETE()` - 13 edges
5. `fetchJson()` - 11 edges
6. `TransactionsPage()` - 8 edges
7. `runExtract()` - 8 edges
8. `Filters, Refresh & Category Drill-down Design` - 7 edges
9. `Unified Scan + Async Extraction Design` - 7 edges
10. `Findash Financial Dashboard Design` - 6 edges

## Surprising Connections (you probably didn't know these)
- `Transaction JSON Schema` --semantically_similar_to--> `Transaction Schema (Design Doc)`  [INFERRED] [semantically similar]
  README.md → docs/plans/2026-04-01-findash-design.md
- `Password-Protected Access (bcrypt)` --semantically_similar_to--> `Auth Design — Middleware + Bcrypt Cookie Session`  [INFERRED] [semantically similar]
  README.md → docs/plans/2026-04-01-findash-design.md
- `GET()` --calls--> `listAllBudgets()`  [INFERRED]
  /Users/adems/projects/findash/src/app/api/investments/prices/route.ts → /Users/adems/projects/findash/src/db/queries/budgets.ts
- `GET()` --calls--> `getMonthSpendByCategory()`  [INFERRED]
  /Users/adems/projects/findash/src/app/api/investments/prices/route.ts → /Users/adems/projects/findash/src/lib/budgets.ts
- `POST()` --calls--> `combineTransactions()`  [INFERRED]
  /Users/adems/projects/findash/src/app/api/extract/[batchId]/run/route.ts → /Users/adems/projects/findash/src/db/queries/transactions.ts

## Communities

### Community 0 - "Investment & Prices"
Cohesion: 0.1
Nodes (22): verifySessionCookie(), computeHoldings(), computeHoldingsForTransactions(), computeTotals(), generateInsightForPeriod(), getInsightByPeriod(), listInsights(), loadTxnsInRange() (+14 more)

### Community 1 - "Navigation & Layout"
Cohesion: 0.08
Nodes (12): handleDelete(), copyPrev(), remove(), save(), submit(), fetchJson(), go(), submit() (+4 more)

### Community 2 - "Transaction Add Form"
Cohesion: 0.11
Nodes (12): createSessionCookie(), verifyPassword(), amountCents(), dayDiff(), findFuzzyDuplicate(), generateTransactionId(), merchantSlug(), randomSuffix() (+4 more)

### Community 3 - "Page Loading Skeletons"
Cohesion: 0.14
Nodes (12): getTransactions(), InvestmentsPage(), TransactionsPage(), filterByCategory(), filterByMonth(), filterByType(), getAvailableMonths(), getInvestmentHoldings() (+4 more)

### Community 4 - "Holdings Display"
Cohesion: 0.13
Nodes (8): clearPendingByBatch(), setCategory(), navigate(), addCustomCategory(), submit(), switchType(), DELETE(), setType()

### Community 5 - "Auth & Middleware"
Cohesion: 0.19
Nodes (9): AddPage(), combineTransactions(), deleteTransaction(), distinctCategories(), getTransactionById(), insertTransaction(), rowToTransaction(), uncombineGroup() (+1 more)

### Community 6 - "AI Extraction Pipeline"
Cohesion: 0.2
Nodes (7): createBatch(), getBatch(), insertPendingRows(), listPendingByBatch(), setBatchStatus(), buildUserContent(), runExtract()

### Community 7 - "Budget Management"
Cohesion: 0.29
Nodes (12): CategoryFilter Component, filterByCategory Utility, filterByType Utility, MonthSelector Grid Dropdown Redesign, RefreshButton Component, Filters, Refresh & Category Drill-down Design, Filters, Refresh & Category Drill-down Implementation Plan, Category Drill-down Spending to Transactions (+4 more)

### Community 8 - "Database Queries"
Cohesion: 0.33
Nodes (12): Per-File Sequential Extraction Design, Per-File Sequential Extraction Implementation Plan, Show Filename in Recent Batches List, One Batch Per File Upload API Design, Sequential Extraction Queue in CaptureUploader, Async Extraction Two-step Split Design, BatchPoller Client Component, Unified Scan + Async Extraction Design (+4 more)

### Community 9 - "Community 9"
Cohesion: 0.22
Nodes (11): Findash App Architecture (Design), Auth Design — Middleware + Bcrypt Cookie Session, Dashboard Pages Design (5 pages), Insights JSON Schema, Findash Financial Dashboard Design, Tech Stack Design (Next.js, Vercel, shadcn, Recharts), Transaction Schema (Design Doc), Findash README (+3 more)

### Community 10 - "Community 10"
Cohesion: 0.24
Nodes (7): deleteAccount(), insertAccount(), listAccounts(), checkOwnAccountTransfer(), extractLast4Candidates(), isOwnAccountTransfer(), SettingsPage()

### Community 11 - "Community 11"
Cohesion: 0.25
Nodes (4): getMonthSpendByCategory(), lastDayOfMonth(), monthProgress(), prevMonth()

### Community 12 - "Community 12"
Cohesion: 0.31
Nodes (7): loadActiveCategories(), loadMerchantHints(), suggestCategory(), buildCategorisePrompt(), buildExtractPrompt(), buildInsightPrompt(), fmtAmount()

### Community 13 - "Community 13"
Cohesion: 0.29
Nodes (6): copyMonth(), deleteBudget(), listAllBudgets(), listBudgetsForMonth(), rowToRecord(), upsertBudget()

### Community 15 - "Community 15"
Cohesion: 0.83
Nodes (3): appliedHashes(), ensureMigrationsTable(), run()

### Community 16 - "Community 16"
Cohesion: 0.5
Nodes (2): Badge(), cn()

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (2): Next.js Agent Rules, CLAUDE.md Graphify Rules

### Community 74 - "Community 74"
Cohesion: 1.0
Nodes (1): File/Document Icon (SVG)

### Community 75 - "Community 75"
Cohesion: 1.0
Nodes (1): Vercel Logo/Brand Icon (Triangle)

### Community 76 - "Community 76"
Cohesion: 1.0
Nodes (1): Next.js Wordmark Logo

### Community 77 - "Community 77"
Cohesion: 1.0
Nodes (1): Globe/Web Icon

### Community 78 - "Community 78"
Cohesion: 1.0
Nodes (1): Browser Window Icon

## Knowledge Gaps
- **10 isolated node(s):** `Next.js Agent Rules`, `CLAUDE.md Graphify Rules`, `Insights JSON Schema`, `Dashboard Pages Design (5 pages)`, `Tech Stack Design (Next.js, Vercel, shadcn, Recharts)` (+5 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 16`** (4 nodes): `Badge()`, `badge.tsx`, `utils.ts`, `cn()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (2 nodes): `Next.js Agent Rules`, `CLAUDE.md Graphify Rules`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 74`** (1 nodes): `File/Document Icon (SVG)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 75`** (1 nodes): `Vercel Logo/Brand Icon (Triangle)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 76`** (1 nodes): `Next.js Wordmark Logo`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 77`** (1 nodes): `Globe/Web Icon`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 78`** (1 nodes): `Browser Window Icon`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `POST()` connect `Transaction Add Form` to `Investment & Prices`, `Page Loading Skeletons`, `Holdings Display`, `Auth & Middleware`, `AI Extraction Pipeline`, `Community 10`, `Community 11`, `Community 12`, `Community 13`?**
  _High betweenness centrality (0.178) - this node is a cross-community bridge._
- **Why does `DELETE()` connect `Holdings Display` to `Community 13`, `Transaction Add Form`, `Community 10`, `Auth & Middleware`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **Why does `setType()` connect `Holdings Display` to `Navigation & Layout`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Are the 23 inferred relationships involving `POST()` (e.g. with `GET()` and `previousIsoWeekKey()`) actually correct?**
  _`POST()` has 23 INFERRED edges - model-reasoned connections that need verification._
- **Are the 17 inferred relationships involving `GET()` (e.g. with `middleware()` and `getInsightByPeriod()`) actually correct?**
  _`GET()` has 17 INFERRED edges - model-reasoned connections that need verification._
- **Are the 10 inferred relationships involving `generateInsightForPeriod()` (e.g. with `GET()` and `POST()`) actually correct?**
  _`generateInsightForPeriod()` has 10 INFERRED edges - model-reasoned connections that need verification._
- **Are the 9 inferred relationships involving `DELETE()` (e.g. with `POST()` and `uncombineGroup()`) actually correct?**
  _`DELETE()` has 9 INFERRED edges - model-reasoned connections that need verification._