import { readFileSync } from "node:fs";
import "dotenv/config";

export interface AccountMapping {
  walletAccountId: string;
  actualAccountId: string;
}

export interface CategoryMapping {
  walletCategoryId: string;
  actualCategoryId: string;
}

export interface MappingFile {
  accounts: AccountMapping[];
  categories: CategoryMapping[];
  uncategorizedActualCategoryId: string | null;
}

export interface Config {
  walletApiToken: string;
  actualServerUrl: string;
  actualServerPassword: string;
  actualSyncId: string;
  actualEncryptionPassword?: string;
  actualDataDir: string;
  mapping: MappingFile;
  syncLookbackDays: number;
  syncCron: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function loadMapping(path: string): MappingFile {
  let raw: string;
  try {
    raw = readFileSync(path, "utf-8");
  } catch {
    throw new Error(
      `Could not read mapping file at "${path}". Copy config/mapping.example.json to ${path} and fill it in.`
    );
  }
  const parsed = JSON.parse(raw) as MappingFile;
  if (!Array.isArray(parsed.accounts) || !Array.isArray(parsed.categories)) {
    throw new Error(`Mapping file at "${path}" is malformed: expected "accounts" and "categories" arrays.`);
  }
  return parsed;
}

export function loadConfig(): Config {
  const mappingFile = process.env.MAPPING_FILE ?? "./config/mapping.json";
  return {
    walletApiToken: requireEnv("WALLET_API_TOKEN"),
    actualServerUrl: requireEnv("ACTUAL_SERVER_URL"),
    actualServerPassword: requireEnv("ACTUAL_SERVER_PASSWORD"),
    actualSyncId: requireEnv("ACTUAL_SYNC_ID"),
    actualEncryptionPassword: process.env.ACTUAL_ENCRYPTION_PASSWORD || undefined,
    actualDataDir: process.env.ACTUAL_DATA_DIR ?? "./actual-data",
    mapping: loadMapping(mappingFile),
    syncLookbackDays: Number(process.env.SYNC_LOOKBACK_DAYS ?? "30"),
    syncCron: process.env.SYNC_CRON ?? "0 * * * *",
  };
}
