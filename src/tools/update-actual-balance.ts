import { mkdirSync } from "node:fs";
import "dotenv/config";
import * as api from "@actual-app/api";

/**
 * For accounts with no automated transaction feed (e.g. Revolut sub-accounts Wallet
 * doesn't sync): adjusts the account balance to a target value by inserting a single
 * balancing transaction for the difference, the same way Actual's own "reconcile" does.
 *
 * Usage: tsx tools/update-actual-balance.ts "<account name>" <targetBalanceInUnits>
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function main(): Promise<void> {
  const [accountName, targetArg] = process.argv.slice(2);
  if (!accountName || targetArg === undefined) {
    throw new Error('Usage: tsx tools/update-actual-balance.ts "<account name>" <targetBalanceInUnits>');
  }
  const targetCents = Math.round(Number(targetArg) * 100);

  const serverURL = requireEnv("ACTUAL_SERVER_URL");
  const password = requireEnv("ACTUAL_SERVER_PASSWORD");
  const syncId = requireEnv("ACTUAL_SYNC_ID");
  const encryptionPassword = process.env.ACTUAL_ENCRYPTION_PASSWORD || undefined;
  const dataDir = process.env.ACTUAL_DATA_DIR ?? "./actual-data";

  mkdirSync(dataDir, { recursive: true });
  await api.init({ dataDir, serverURL, password });
  await api.downloadBudget(syncId, { password: encryptionPassword });

  try {
    const accounts = await api.getAccounts();
    const account = accounts.find((a) => a.name === accountName);
    if (!account) {
      throw new Error(`No Actual account named "${accountName}". Run "npm run actual:list" to see valid names.`);
    }

    const currentCents = await api.getAccountBalance(account.id);
    const diffCents = targetCents - currentCents;

    if (diffCents === 0) {
      console.log(`"${accountName}" is already at ${(targetCents / 100).toFixed(2)} — nothing to do.`);
      return;
    }

    await api.addTransactions(account.id, [
      {
        date: new Date().toISOString().slice(0, 10),
        amount: diffCents,
        payee_name: "Balance adjustment",
        notes: "Manual balance sync (tools/update-actual-balance.ts)",
        cleared: true,
      },
    ]);

    console.log(
      `"${accountName}": ${(currentCents / 100).toFixed(2)} -> ${(targetCents / 100).toFixed(2)} ` +
        `(adjustment: ${(diffCents / 100).toFixed(2)})`
    );
  } finally {
    await api.shutdown();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
