import { mkdirSync } from "node:fs";
import "dotenv/config";
import * as api from "@actual-app/api";

/**
 * One-off helper: creates an Actual account. Useful when a Wallet account
 * has no counterpart yet (e.g. before filling in config/mapping.json).
 *
 * Usage: tsx tools/create-actual-account.ts "<name>" [initialBalanceInUnits] [--offbudget]
 *
 * initialBalanceInUnits is in normal decimal units (e.g. "146" for 146.00€) — Actual's API
 * itself takes amounts in the currency's minor unit (cents), so this converts before calling it.
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const offbudget = args.includes("--offbudget");
  const positional = args.filter((a) => !a.startsWith("--"));
  const [name, balanceArg] = positional;

  if (!name) {
    throw new Error('Usage: tsx tools/create-actual-account.ts "<name>" [initialBalance] [--offbudget]');
  }
  const initialBalance = balanceArg ? Math.round(Number(balanceArg) * 100) : 0;

  const serverURL = requireEnv("ACTUAL_SERVER_URL");
  const password = requireEnv("ACTUAL_SERVER_PASSWORD");
  const syncId = requireEnv("ACTUAL_SYNC_ID");
  const encryptionPassword = process.env.ACTUAL_ENCRYPTION_PASSWORD || undefined;
  const dataDir = process.env.ACTUAL_DATA_DIR ?? "./actual-data";

  mkdirSync(dataDir, { recursive: true });
  await api.init({ dataDir, serverURL, password });
  await api.downloadBudget(syncId, { password: encryptionPassword });

  try {
    const id = await api.createAccount({ name, offbudget }, initialBalance);
    console.log(`Created account "${name}" (offbudget: ${offbudget}, initial balance: ${initialBalance}) -> ${id}`);
  } finally {
    await api.shutdown();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
