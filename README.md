# SpendWise — Premium, Private Personal Expense Tracker

SpendWise is a personal finance web application built around a strict **privacy-first architecture**. It allows users to track income, expenses, budgets, savings goals, recurring bills, and financial analytics with fintech UI polish—**without ever uploading financial history to application servers**.

---

## 🛡️ Core Privacy Architecture

Most financial applications store your bank accounts, purchases, and net worth on central corporate databases. **SpendWise flips this paradigm completely:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             SpendWise Architecture                          │
├────────────────────────────────┬────────────────────────────────────────────┤
│   Neon PostgreSQL (Auth Only)  │   User Device (IndexedDB) & Google Drive   │
├────────────────────────────────┼────────────────────────────────────────────┤
│ • User ID & Email              │ • All Income & Expense Transactions        │
│ • Password Hash (Bcrypt 12)    │ • Budgets & Monthly Allocations            │
│ • Session & Reset Tokens       │ • Recurring Rules & Subscriptions          │
│ • Google OAuth Tokens (Drive)  │ • Savings Goals & Deposit Logs             │
│                                │ • Custom Categories & Notes                │
│ ❌ ZERO Financial Data Stored!  │ 🔒 Optional AES-GCM-256 Client Encryption  │
└────────────────────────────────┴────────────────────────────────────────────┘
```

1. **Authentication Database (Neon PostgreSQL):**
   Stores *strictly* authentication credentials and authorization tokens (user ID, email, password hash, account status, and Google OAuth tokens). **Neon PostgreSQL NEVER stores transactions, categories, budgets, or financial amounts.**
2. **Local-First Financial Store (IndexedDB):**
   All financial records live in the user's browser using IndexedDB. The application works offline and never leaks transaction data over API endpoints.
3. **Personal Cloud Storage (Google Drive):**
   When Google Drive is connected, SpendWise uses Google's restricted `https://www.googleapis.com/auth/drive.file` scope to create and manage backup files exclusively inside a private folder named `SpendWise Backups` in the user's personal Drive. SpendWise servers never retain copies of backup payloads.
4. **Client-Side End-to-End Encryption (Web Crypto API):**
   Users can enable passphrase-based encryption. Backups are encrypted with **AES-GCM 256-bit** derived using **PBKDF2 (100,000 iterations)** with unique random salts and nonces before leaving the browser. Neither Google nor SpendWise servers can read the encrypted records.

---

## ✨ Features

- **Dynamic Financial Dashboard:**
  - Real-time calculations: Total Income, Total Expenses, Net Cash Flow, Savings Rate (%).
  - Monthly budget utilization progress bar with alert triggers at 75%, 90%, and 100%.
  - Month-over-month spending comparison (% difference).
  - Monthly Cash Flow comparison chart (Recharts).
  - Spending by category donut chart with breakdown list.
  - Upcoming recurring bills widget with 1-click "Record Now" button.
- **Transaction Ledger:**
  - Full CRUD for income and expense transactions.
  - Stored in integer minor units (cents) to avoid floating-point errors.
  - Multi-filtering: text search (notes, categories, tags), transaction type, category, payment method, date range, and amount range.
  - Sorting by date or amount (asc/desc).
  - Pagination (15 records per page).
  - Duplicate transaction button.
  - Undo deletion support.
- **Monthly Budgets & Rollovers:**
  - Overall monthly budget and category-specific budgets.
  - Rollover support: carry over surpluses or deficits into the next month.
  - Visual status indicators and warnings when thresholds are approached.
- **Visual Analytics:**
  - Interactive charts powered by Recharts.
  - Multi-month Cash Flow Momentum line chart.
  - Daily spending activity bar chart.
  - Category distribution donut chart.
  - Timeframe selector: This Month, Last 3 Months, Year-to-Date.
- **Recurring Transactions & Subscriptions:**
  - Daily, Weekly, Monthly, Yearly, and Custom intervals.
  - Automatically calculates next due dates.
  - Distinguishes recurring rules from actual ledger entries: no premature phantom transactions.
  - 1-click confirmation to record transaction and advance due date.
- **Savings Goals & Milestones:**
  - Target amount, current balance, target completion date, and purpose note.
  - Progress bar and percentage.
  - Deposit and contribution history log.
- **CSV Import & Export:**
  - RFC 4180 compliant CSV parser and exporter.
  - Formula injection protection (sanitizes `=, +, -, @` prefixes).
  - 4-step interactive import wizard with column mapping, duplicate detection, and row validation.
  - Full JSON snapshot export and restore.
- **Android Mobile Application (.APK):**
  - Native Android application built with Capacitor and Gradle.
  - Downloadable directly from the web application (`/spendwise.apk`).
  - Supports Android 7.0+ (API 24 through 36).
  - 100% offline-ready with local IndexedDB storage and direct Google Drive cloud sync.
- **Dual Visual Themes:**
  - **Deep Midnight Mode:** Graphite and charcoal surfaces with electric mint and emerald accents.
  - **Crisp Pure White Mode:** Pure `#FFFFFF` background, high-definition black bordered containers, dark typography, and luxury gold/amber gradient accents.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 18+ (tested on Node v24)
- npm 9+

### 1. Clone & Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `server/.env`:
```bash
cp .env.example server/.env
```

Edit `server/.env`:
```env
PORT=3001
CLIENT_URL=http://localhost:5173
DATABASE_URL=postgresql://username:password@ep-your-instance.neon.tech/spendwise?sslmode=require
JWT_SECRET=super_secret_spendwise_jwt_signing_key_at_least_32_chars_long
GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/drive/callback
```

> **Note on Neon PostgreSQL:**
> If `DATABASE_URL` is omitted, the server automatically starts with an in-memory database fallback so you can evaluate the full application locally immediately.

### 3. Build & Run in Development
```bash
# Build shared package
npm run build --workspace=shared

# Run server and client concurrently
npm run dev
```

Open your browser at **`http://localhost:5173`**.

---

## 🔑 External Integrations Setup

### 1. Neon PostgreSQL Database
1. Go to [Neon.tech](https://neon.tech) and create a free project named `spendwise-auth`.
2. Copy the connection string (`postgresql://...`).
3. Paste it into `DATABASE_URL` in `server/.env`.
4. SpendWise automatically applies migrations on server startup (`server/src/db/schema.sql`).

### 2. Google OAuth 2.0 (Google Drive Integration)
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project named `SpendWise`.
3. Enable the **Google Drive API**:
   - Navigate to **APIs & Services** > **Library** > Search for "Google Drive API" > Click **Enable**.
4. Configure the **OAuth Consent Screen**:
   - User Type: **External**.
   - App Name: `SpendWise`.
   - Scopes: Add `.../auth/drive.file` and `.../auth/userinfo.email`.
5. Create **Credentials**:
   - Go to **Credentials** > **Create Credentials** > **OAuth client ID**.
   - Application Type: **Web application**.
   - Authorized JavaScript origins: `http://localhost:5173` (and your production frontend URL).
   - Authorized redirect URIs: `http://localhost:3001/api/drive/callback` (and your production server redirect URL).
6. Copy the **Client ID** and **Client Secret** into `server/.env`.

---

## 🧪 Running Automated Tests

Run the test suite covering authentication, password hashing, Zod schemas, financial minor units calculations, CSV RFC 4180 parsing, and formula injection defenses:

```bash
# Run server tests
npm run test --workspace=server

# Run financial integrity tests
node --test tests/financial.test.ts
```

---

## 🔒 Security & Reliability Measures

- **No Plaintext Passwords:** Passwords hashed with 12 rounds of bcrypt.
- **Secure Cookies:** Session tokens stored in HTTP-only, SameSite=Lax cookies with expiration.
- **Least Privilege Drive Permissions:** Uses `drive.file` instead of full Drive access. Only files created by SpendWise are accessible.
- **Spreadsheet Security:** Formulas starting with `=, +, -, @` are prepended with `'` to prevent CSV formula injection.
- **Zero Financial Tracking:** No analytics tracking beacons or advertising SDKs.
