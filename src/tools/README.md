# src/tools/

One-off scripts for setting up `config/mapping.json` — extracting IDs from Wallet/Actual, and creating
accounts/categories on the Actual side when a Wallet counterpart doesn't exist yet. They're not part of the
sync/scheduler flow that runs continuously — you run them by hand while configuring the bridge — but they compile
into `dist/tools/` like the rest of `src/`, so they're available inside the Docker image too.

All of them read the same `.env` as the main app (`WALLET_API_TOKEN` for the Wallet ones, `ACTUAL_SERVER_URL` /
`ACTUAL_SERVER_PASSWORD` / `ACTUAL_SYNC_ID` / `ACTUAL_ENCRYPTION_PASSWORD` / `ACTUAL_DATA_DIR` for the Actual ones).

## Extracting IDs

### `npm run wallet:list`
[list-wallet-resources.ts](list-wallet-resources.ts) — prints every Wallet account and category with its ID, and
writes the full objects to `src/tools/output/wallet-resources.json`.

### `npm run actual:list`
[list-actual-resources.ts](list-actual-resources.ts) — connects to your Actual server, prints every account and
category with its ID, and writes the full objects to `src/tools/output/actual-resources.json`.

`src/tools/output/` is gitignored (and dockerignored) — it contains your real account/category names.

## Creating things on Actual

Use these when `wallet:list` shows a Wallet account/category that has no sensible Actual counterpart yet.

### `npm run actual:create-account -- "<name>" [initialBalance] [--offbudget]`
[create-actual-account.ts](create-actual-account.ts) — creates an Actual account. `initialBalance` is in normal
decimal units (e.g. `146` for 146.00€) — the script converts to Actual's internal minor-unit (cents) format itself.
Pass `--offbudget` for accounts that shouldn't count toward monthly budgeting (investments, savings pots).

Example: `npm run actual:create-account -- "PayPal" 146`

### `npm run actual:create-category -- "<name>" "<groupId>"`
[create-actual-category.ts](create-actual-category.ts) — creates a category inside an existing category group.
Run `npm run actual:list` first, or check `api.getCategoryGroups()`, to find the `groupId` you want it under.

Example: `npm run actual:create-category -- "Shopping" "fc3825fd-b982-4b72-b768-5b30844cf832"`

## Manually keeping a balance in sync

For accounts with no automated feed into this project (e.g. a Revolut sub-account Wallet doesn't bank-sync), you
can still keep Actual's balance accurate without transaction-level detail:

### `npm run actual:update-balance -- "<account name>" <targetBalanceInUnits>`
[update-actual-balance.ts](update-actual-balance.ts) — reads the account's current balance, and if it differs from
the target, inserts one adjustment transaction (payee "Balance adjustment") for the difference — the same
mechanism Actual's own UI "reconcile" uses. Read the real balance from the source (e.g. the Revolut app) and pass
it here whenever you want to catch up. No-op if the balance already matches.

Example: `npm run actual:update-balance -- "Revolut - Investimenti" 2892`

## Typical workflow

1. `npm run wallet:list` and `npm run actual:list` to see what exists on each side.
2. For any Wallet account/category with no Actual match, either create one (`actual:create-account` /
   `actual:create-category`) or decide to skip it.
3. Re-run `npm run actual:list` if you created anything, to pick up the new IDs.
4. Fill in `config/mapping.json` using the IDs from both JSON files.

## Running these inside Docker

The npm scripts above (`npm run wallet:list`, etc.) use `tsx` to run the `.ts` source directly — convenient
locally, but `tsx` is a devDependency and isn't installed in the production image. Inside a running container, use
the compiled output with plain `node` instead:

```bash
docker compose exec wallet-to-actualbudget node dist/tools/list-wallet-resources.js
docker compose exec wallet-to-actualbudget node dist/tools/list-actual-resources.js
docker compose exec wallet-to-actualbudget node dist/tools/create-actual-account.js "PayPal" 146
docker compose exec wallet-to-actualbudget node dist/tools/create-actual-category.js "Shopping" "<groupId>"
docker compose exec wallet-to-actualbudget node dist/tools/update-actual-balance.js "Revolut - Investimenti" 2892
```

## Adding a new tool

Scripts here are ordinary `src/` TypeScript — they compile into `dist/tools/` with `npm run build` and are covered
by the root `npm run typecheck`, no separate config needed. Follow the existing scripts' pattern: read env vars
directly (don't depend on `config/mapping.json` existing), connect, do the one thing, print what happened.
