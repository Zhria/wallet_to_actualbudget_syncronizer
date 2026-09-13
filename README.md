# wallet-to-actualbudget

A bridge that recurringly syncs transactions from [Wallet by BudgetBakers](https://budgetbakers.com/en/products/wallet/)
into [Actual Budget](https://actualbudget.org/), using both apps' official APIs.

- **Wallet** — [REST API](https://rest.budgetbakers.com/wallet/reference) (requires a Premium subscription and a
  personal API token from Wallet's web app under Settings → API).
- **Actual Budget** — the official [`@actual-app/api`](https://actualbudget.org/docs/api/) Node package.

Every run re-pulls a rolling window of recent Wallet transactions (`SYNC_LOOKBACK_DAYS`, default 30) and hands them to
Actual's `importTransactions()`, which dedupes by `imported_id`. That makes syncing idempotent — safe to run hourly,
safe to re-run after a failure — with no fragile cursor/offset state to track between runs.

## How it works

1. For each account pair listed in `config/mapping.json`, fetch Wallet records for that account since the lookback
   date (`GET /v1/api/records`).
2. Map each record to an Actual transaction: date, amount (converted to integer cents), payee (`counterParty`),
   notes, category (via the category mapping), and `imported_id` (the Wallet record's own ID, for dedup).
3. Import the batch into the corresponding Actual account with `importTransactions()`.

**Known limitation:** Wallet transfers between accounts are imported as plain transactions on each side, not as
linked Actual transfers.

## Setup

1. **Get a Wallet API token.** In the Wallet web app: Settings → API → generate a personal token (Premium required).
2. **Get your Actual Budget sync ID.** In Actual: Settings → Show advanced settings → Sync ID. You'll also need your
   server password, and your end-to-end encryption password if the budget is encrypted.
3. Copy `.env.example` to `.env` and fill in the values.
4. Copy `config/mapping.example.json` to `config/mapping.json`. Run `npm run wallet:list` to print every Wallet
   account/category ID, and use `npx tsx` with Actual's API (or the Actual UI) to find your Actual account/category
   IDs, then fill in the mapping pairs you want synced.

## Running

```bash
npm install

# One-off sync
npm run sync

# Run continuously with an internal cron schedule (SYNC_CRON, default hourly)
npm run schedule
```

### Docker

```bash
cp docker-compose.example.yml docker-compose.yml
docker compose up -d --build
```

The container runs `npm run schedule` internally, so it stays up and syncs on the configured cron expression.
Mount your filled-in `config/mapping.json` and a persistent volume for `actual-data` (Actual's local cache), as
shown in `docker-compose.example.yml`.

## Configuration reference

See `.env.example` for all environment variables. Key ones:

| Variable | Description |
| --- | --- |
| `WALLET_API_TOKEN` | Wallet personal API token |
| `ACTUAL_SERVER_URL`, `ACTUAL_SERVER_PASSWORD`, `ACTUAL_SYNC_ID` | Actual Budget server connection |
| `ACTUAL_ENCRYPTION_PASSWORD` | Only needed for end-to-end encrypted budgets |
| `MAPPING_FILE` | Path to the account/category mapping JSON (default `./config/mapping.json`) |
| `SYNC_LOOKBACK_DAYS` | How many days back to re-pull each run (default 30) |
| `SYNC_CRON` | Cron expression used by `npm run schedule` (default hourly) |
