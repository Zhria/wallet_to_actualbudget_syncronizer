# tools/

One-off scripts for setting up `config/mapping.json` — extracting IDs from Wallet/Actual, and creating
accounts/categories on the Actual side when a Wallet counterpart doesn't exist yet. None of these run inside the
Docker image or the sync/scheduler flow (`src/`); they're for you to run by hand, locally, while configuring the
bridge.

All of them read the same `.env` as the main app (`WALLET_API_TOKEN` for the Wallet ones, `ACTUAL_SERVER_URL` /
`ACTUAL_SERVER_PASSWORD` / `ACTUAL_SYNC_ID` / `ACTUAL_ENCRYPTION_PASSWORD` / `ACTUAL_DATA_DIR` for the Actual ones).

## Extracting IDs

### `npm run wallet:list`
[list-wallet-resources.ts](list-wallet-resources.ts) — prints every Wallet account and category with its ID, and
writes the full objects to `tools/output/wallet-resources.json`.

### `npm run actual:list`
[list-actual-resources.ts](list-actual-resources.ts) — connects to your Actual server, prints every account and
category with its ID, and writes the full objects to `tools/output/actual-resources.json`.

`tools/output/` is gitignored — it contains your real account/category names.

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

## Typical workflow

1. `npm run wallet:list` and `npm run actual:list` to see what exists on each side.
2. For any Wallet account/category with no Actual match, either create one (`actual:create-account` /
   `actual:create-category`) or decide to skip it.
3. Re-run `npm run actual:list` if you created anything, to pick up the new IDs.
4. Fill in `config/mapping.json` using the IDs from both JSON files.

## Adding a new tool

Scripts here aren't compiled into `dist/` (see the root `tsconfig.json`'s `rootDir`/`include`) and aren't
type-checked by the root `npm run typecheck` — they have their own [tsconfig.json](tsconfig.json), covered by the
same `npm run typecheck` command (it runs both). Follow the existing scripts' pattern: read env vars directly
(don't depend on `config/mapping.json` existing), connect, do the one thing, print what happened.
