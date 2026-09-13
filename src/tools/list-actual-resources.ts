import { mkdirSync, writeFileSync } from "node:fs";
import "dotenv/config";
import * as api from "@actual-app/api";

/**
 * Extracts every Actual account and category (with their IDs) and writes
 * them to src/tools/output/actual-resources.json, for building config/mapping.json.
 */
const OUTPUT_PATH = new URL("./output/actual-resources.json", import.meta.url);

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function main(): Promise<void> {
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
    const categories = await api.getCategories();

    console.log("Accounts:");
    for (const a of accounts) {
      console.log(`  ${a.id}  ${a.name}${a.closed ? " (closed)" : ""}`);
    }

    console.log("\nCategories:");
    for (const c of categories) {
      console.log(`  ${c.id}  ${c.name}${c.hidden ? " (hidden)" : ""}`);
    }

    mkdirSync(new URL("./output/", import.meta.url), { recursive: true });
    writeFileSync(
      OUTPUT_PATH,
      JSON.stringify({ generatedAt: new Date().toISOString(), accounts, categories }, null, 2)
    );
    console.log(`\nWritten to ${OUTPUT_PATH.pathname}`);
  } finally {
    await api.shutdown();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
