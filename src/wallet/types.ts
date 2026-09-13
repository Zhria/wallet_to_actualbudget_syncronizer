export interface WalletAmount {
  currencyCode: string;
  value: number;
}

export interface WalletCategoryEmbed {
  id: string;
  name: string;
}

export interface WalletRecord {
  id: string;
  accountId: string;
  accountName: string;
  amount: WalletAmount;
  category: WalletCategoryEmbed | null;
  counterParty: string | null;
  note: string | null;
  recordDate: string;
  recordState: "reconciled" | "cleared" | "uncleared" | "void" | "waitForAssign";
  recordType: "income" | "expense";
  transfer: { transferId: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface WalletAccount {
  id: string;
  name: string;
  accountType: string;
  currencyCode: string;
  archived: boolean;
}

export interface WalletCategory {
  id: string;
  name: string;
  systemId?: string;
  parentId?: string;
  archived: boolean;
}

export interface PaginatedResponse {
  limit: number;
  offset: number;
  nextOffset?: number;
  total?: number;
}

export interface RecordsResponse extends PaginatedResponse {
  records: WalletRecord[];
}

export interface AccountsResponse extends PaginatedResponse {
  accounts: WalletAccount[];
}

export interface CategoriesResponse extends PaginatedResponse {
  categories: WalletCategory[];
}
