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
4. Copy `config/mapping.example.json` to `config/mapping.json`. Use the scripts in
   [`src/tools/`](src/tools/README.md) to find (and, if needed, create) the account/category IDs on each side, then
   fill in the mapping pairs you want synced.

## Running

```bash
npm install

# One-off sync
npm run sync

# Run continuously with an internal cron schedule (SYNC_CRON, default hourly)
npm run schedule
```

### Docker

`docker-compose.example.yml` always pulls the published image from `ghcr.io` — it never builds locally. That means
a versioned image needs to exist first: see [Releasing a versioned image](#releasing-a-versioned-image) below if
you haven't pushed a release tag yet.

```bash
cp docker-compose.example.yml docker-compose.yml
docker compose up -d
```

The container runs `npm run schedule` internally, so it stays up and syncs on the configured cron expression.
Mount your filled-in `config/mapping.json` and a persistent volume for `actual-data` (Actual's local cache), as
shown in `docker-compose.example.yml`. To pick up a newer release later: `docker compose pull && docker compose up -d`.

### Releasing a versioned image

Pushing a build to `ghcr.io` is fully automated by [`.github/workflows/docker-publish.yml`](.github/workflows/docker-publish.yml),
triggered only by a version tag — nothing runs on ordinary pushes:

```bash
# 1. Bump the version in package.json, commit it
npm version 0.2.0 --no-git-tag-version
git add package.json package-lock.json
git commit -m "Release 0.2.0"

# 2. Tag it (must be "v" + the exact package.json version) and push both
git tag v0.2.0
git push origin master v0.2.0
```

CI then type-checks, builds, and pushes `ghcr.io/zhria/wallet-to-actualbudget:0.2.0` and `:latest`. It fails the
build if the tag doesn't match `package.json`'s version, so the two can't drift apart.

One-time setup on GitHub: under Settings → Actions → General → Workflow permissions, make sure "Read and write
permissions" is selected — otherwise the built-in `GITHUB_TOKEN` can't push to the container registry.

## Tools

[`src/tools/`](src/tools/README.md) holds one-off scripts for setting up `config/mapping.json` — listing
Wallet/Actual accounts and categories with their IDs, and creating Actual accounts/categories when a Wallet
counterpart doesn't exist yet. They're not part of the sync/scheduler flow, but they do compile into the Docker
image (`dist/tools/`), so they're also runnable from inside a running container. See
[src/tools/README.md](src/tools/README.md) for the full list and usage.

## Configuration reference

See `.env.example` for all environment variables. Key ones:

| Variable | Description |
| --- | --- |
| `WALLET_API_TOKEN` | Wallet personal API token |
| `ACTUAL_SERVER_URL`, `ACTUAL_SERVER_PASSWORD`, `ACTUAL_SYNC_ID` | Actual Budget server connection |
| `ACTUAL_ENCRYPTION_PASSWORD` | Only needed for end-to-end encrypted budgets |
| `ACTUAL_DATA_DIR` | Local cache directory for Actual's SDK (default `./actual-data`) — see below |
| `MAPPING_FILE` | Path to the account/category mapping JSON (default `./config/mapping.json`) |
| `SYNC_LOOKBACK_DAYS` | How many days back to re-pull each run (default 30) |
| `SYNC_CRON` | Cron expression used by `npm run schedule` (default hourly) |

`ACTUAL_DATA_DIR` isn't something you fill in — `@actual-app/api` manages it. On first connect it downloads your
whole budget into a local SQLite file there, and every run after that just syncs the delta. Keeping this directory
around means each sync stays fast (incremental); wiping it just forces the next run to redownload the full budget,
it's not otherwise dangerous. It's created automatically if missing, gitignored, and — in Docker — backed by the
`actual-data` named volume so it survives container restarts and rebuilds.
