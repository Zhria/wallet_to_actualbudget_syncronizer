import type {
  AccountsResponse,
  CategoriesResponse,
  RecordsResponse,
  WalletAccount,
  WalletCategory,
  WalletRecord,
} from "./types.js";

const BASE_URL = "https://rest.budgetbakers.com/wallet/v1/api";
const PAGE_SIZE = 200;

export class WalletClient {
  constructor(private readonly apiToken: string) {}

  private async get<T>(path: string, params: Record<string, string | number | undefined>): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${this.apiToken}` },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Wallet API request failed: ${res.status} ${res.statusText} for ${url} — ${body}`);
    }

    return (await res.json()) as T;
  }

  /**
   * Fetches every record for a single account with recordDate >= sinceDate,
   * transparently paging through results.
   */
  async fetchRecordsSince(accountId: string, sinceDate: Date): Promise<WalletRecord[]> {
    const records: WalletRecord[] = [];
    let offset = 0;

    for (;;) {
      const page = await this.get<RecordsResponse>("/records", {
        accountId,
        recordDate: `gte.${sinceDate.toISOString()}`,
        sortBy: "+recordDate",
        limit: PAGE_SIZE,
        offset,
      });

      records.push(...page.records);

      if (page.nextOffset === undefined) {
        break;
      }
      offset = page.nextOffset;
    }

    return records;
  }

  async fetchAccounts(): Promise<WalletAccount[]> {
    const accounts: WalletAccount[] = [];
    let offset = 0;

    for (;;) {
      const page = await this.get<AccountsResponse>("/accounts", { limit: PAGE_SIZE, offset });
      accounts.push(...page.accounts);
      if (page.nextOffset === undefined) {
        break;
      }
      offset = page.nextOffset;
    }

    return accounts;
  }

  async fetchCategories(): Promise<WalletCategory[]> {
    const categories: WalletCategory[] = [];
    let offset = 0;

    for (;;) {
      const page = await this.get<CategoriesResponse>("/categories", { limit: PAGE_SIZE, offset });
      categories.push(...page.categories);
      if (page.nextOffset === undefined) {
        break;
      }
      offset = page.nextOffset;
    }

    return categories;
  }
}
