import { loadConfig } from "./config.js";
import { WalletClient } from "./wallet/client.js";
import type { WalletRecord } from "./wallet/types.js";
import { connectToActual, disconnectFromActual, importAccountTransactions } from "./actual/client.js";
import type { ActualTransaction } from "./actual/client.js";

function toActualDate(recordDate: string): string {
  return recordDate.slice(0, 10); // "2024-01-01T09:28:41.200Z" -> "2024-01-01"
}

function toActualAmount(value: number): number {
  return Math.round(value * 100);
}

function resolveCategory(
  record: WalletRecord,
  categoryMap: Map<string, string>,
  uncategorizedActualCategoryId: string | null
): string | undefined {
  if (record.category) {
    const mapped = categoryMap.get(record.category.id);
    if (mapped) {
      return mapped;
    }
  }
  return uncategorizedActualCategoryId ?? undefined;
}

function toActualTransaction(
  record: WalletRecord,
  categoryMap: Map<string, string>,
  uncategorizedActualCategoryId: string | null
): ActualTransaction {
  return {
    date: toActualDate(record.recordDate),
    amount: toActualAmount(record.amount.value),
    payee_name: record.counterParty || undefined,
    notes: record.note || undefined,
    category: resolveCategory(record, categoryMap, uncategorizedActualCategoryId),
    imported_id: record.id,
    cleared: record.recordState !== "uncleared" && record.recordState !== "waitForAssign",
  };
}

export async function runSync(): Promise<void> {
  const config = loadConfig();
  const wallet = new WalletClient(config.walletApiToken);
  const categoryMap = new Map(config.mapping.categories.map((c) => [c.walletCategoryId, c.actualCategoryId]));
  const sinceDate = new Date(Date.now() - config.syncLookbackDays * 24 * 60 * 60 * 1000);

  console.log(`Connecting to Actual Budget at ${config.actualServerUrl}...`);
  await connectToActual(config);

  try {
    for (const accountMapping of config.mapping.accounts) {
      console.log(
        `Syncing Wallet account ${accountMapping.walletAccountId} -> Actual account ${accountMapping.actualAccountId} (last ${config.syncLookbackDays} days)`
      );

      const records = await wallet.fetchRecordsSince(accountMapping.walletAccountId, sinceDate);
      console.log(`  Fetched ${records.length} record(s) from Wallet.`);

      if (records.length === 0) {
        continue;
      }

      const transactions = records.map((r) =>
        toActualTransaction(r, categoryMap, config.mapping.uncategorizedActualCategoryId)
      );

      const result = await importAccountTransactions(accountMapping.actualAccountId, transactions);
      console.log(`  Actual: ${result.added.length} added, ${result.updated.length} updated.`);
    }
  } finally {
    await disconnectFromActual();
  }

  console.log("Sync complete.");
}
