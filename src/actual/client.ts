import { mkdirSync } from "node:fs";
import * as api from "@actual-app/api";
import type { Config } from "../config.js";

export type ActualTransaction = Omit<Parameters<typeof api.importTransactions>[1][number], "account">;

export async function connectToActual(config: Config): Promise<void> {
  mkdirSync(config.actualDataDir, { recursive: true });

  await api.init({
    dataDir: config.actualDataDir,
    serverURL: config.actualServerUrl,
    password: config.actualServerPassword,
  });

  await api.downloadBudget(config.actualSyncId, {
    password: config.actualEncryptionPassword,
  });
}

export async function importAccountTransactions(
  actualAccountId: string,
  transactions: ActualTransaction[]
): Promise<{ added: string[]; updated: string[] }> {
  const result = await api.importTransactions(
    actualAccountId,
    transactions.map((t) => ({ ...t, account: actualAccountId }))
  );
  if (result.errors && result.errors.length > 0) {
    throw new Error(
      `Actual rejected ${result.errors.length} transaction(s) for account ${actualAccountId}: ${JSON.stringify(result.errors)}`
    );
  }
  return { added: result.added ?? [], updated: result.updated ?? [] };
}

export async function disconnectFromActual(): Promise<void> {
  await api.shutdown();
}
