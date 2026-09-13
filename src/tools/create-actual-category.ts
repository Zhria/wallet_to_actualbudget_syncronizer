import { mkdirSync } from "node:fs";
import "dotenv/config";
import * as api from "@actual-app/api";

/**
 * One-off helper: creates an Actual category inside an existing category group.
 * Run `npm run actual:list` first to find group IDs (or api.getCategoryGroups()).
 *
 * Usage: tsx tools/create-actual-category.ts "<name>" "<groupId>"
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function main(): Promise<void> {
  const [name, groupId] = process.argv.slice(2);
  if (!name || !groupId) {
    throw new Error('Usage: tsx tools/create-actual-category.ts "<name>" "<groupId>"');
  }

  const serverURL = requireEnv("ACTUAL_SERVER_URL");
  const password = requireEnv("ACTUAL_SERVER_PASSWORD");
  const syncId = requireEnv("ACTUAL_SYNC_ID");
  const encryptionPassword = process.env.ACTUAL_ENCRYPTION_PASSWORD || undefined;
  const dataDir = process.env.ACTUAL_DATA_DIR ?? "./actual-data";

  mkdirSync(dataDir, { recursive: true });
  await api.init({ dataDir, serverURL, password });
  await api.downloadBudget(syncId, { password: encryptionPassword });

  try {
    const id = await api.createCategory({ name, group_id: groupId, is_income: false, hidden: false });
    console.log(`Created category "${name}" in group ${groupId} -> ${id}`);
  } finally {
    await api.shutdown();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
