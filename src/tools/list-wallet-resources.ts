import { mkdirSync, writeFileSync } from "node:fs";
import "dotenv/config";
import { WalletClient } from "../wallet/client.js";
import type { WalletAccount, WalletCategory } from "../wallet/types.js";

/**
 * Extracts every Wallet account and category (with their IDs) and writes
 * them to src/tools/output/wallet-resources.json, for building config/mapping.json.
 */
const OUTPUT_PATH = new URL("./output/wallet-resources.json", import.meta.url);

async function main(): Promise<void> {
  const token = process.env.WALLET_API_TOKEN;
  if (!token) {
    throw new Error("Missing WALLET_API_TOKEN environment variable.");
  }

  const wallet = new WalletClient(token);

  const accounts: WalletAccount[] = await wallet.fetchAccounts();
  const categories: WalletCategory[] = await wallet.fetchCategories();

  console.log("Accounts:");
  for (const a of accounts) {
    console.log(`  ${a.id}  ${a.name}  (${a.accountType}, ${a.currencyCode}${a.archived ? ", archived" : ""})`);
  }

  console.log("\nCategories:");
  for (const c of categories) {
    console.log(`  ${c.id}  ${c.name}${c.archived ? " (archived)" : ""}`);
  }

  mkdirSync(new URL("./output/", import.meta.url), { recursive: true });
  writeFileSync(
    OUTPUT_PATH,
    JSON.stringify({ generatedAt: new Date().toISOString(), accounts, categories }, null, 2)
  );
  console.log(`\nWritten to ${OUTPUT_PATH.pathname}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
