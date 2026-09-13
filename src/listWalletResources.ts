import "dotenv/config";
import { WalletClient } from "./wallet/client.js";

/**
 * Helper for building config/mapping.json: prints every Wallet account and
 * category with its ID, so you can copy the IDs you need into the mapping file.
 */
async function main(): Promise<void> {
  const token = process.env.WALLET_API_TOKEN;
  if (!token) {
    throw new Error("Missing WALLET_API_TOKEN environment variable.");
  }

  const wallet = new WalletClient(token);

  const accounts = await wallet.fetchAccounts();
  console.log("Accounts:");
  for (const a of accounts) {
    console.log(`  ${a.id}  ${a.name}  (${a.accountType}, ${a.currencyCode}${a.archived ? ", archived" : ""})`);
  }

  const categories = await wallet.fetchCategories();
  console.log("\nCategories:");
  for (const c of categories) {
    console.log(`  ${c.id}  ${c.name}${c.archived ? " (archived)" : ""}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
