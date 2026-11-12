import { apiClient } from "./client";
import { AccountResponse, AccountType } from "@/types/api";

export interface CreateAccountRequest {
  name: string;
  type: AccountType | string;
  currencyCode?: string;
  currency?: string;
  initialBalance: number;
  isDefault?: boolean;
}

export interface UpdateAccountRequest {
  name: string;
  type?: AccountType | string;
  isArchived?: boolean;
}

function resolveAccountType(type: AccountType | string): AccountType {
  if (typeof type === 'number') return type;
  const lower = String(type).toLowerCase();
  if (lower.includes('saving')) return AccountType.Savings;
  if (lower.includes('credit')) return AccountType.CreditCard;
  if (lower.includes('cash')) return AccountType.Cash;
  if (lower.includes('invest')) return AccountType.Investment;
  return AccountType.Checking;
}

export const accountsApi = {
  async getAccounts(): Promise<AccountResponse[]> {
    return apiClient<AccountResponse[]>("/api/v1/accounts");
  },

  async createAccount(data: CreateAccountRequest): Promise<AccountResponse> {
    const payload = {
      name: data.name,
      type: resolveAccountType(data.type),
      currencyCode: data.currencyCode || data.currency || 'USD',
      initialBalance: data.initialBalance,
      isDefault: data.isDefault ?? false,
    };
    return apiClient<AccountResponse>("/api/v1/accounts", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async create(data: CreateAccountRequest): Promise<AccountResponse> {
    return accountsApi.createAccount(data);
  },

  async updateAccount(id: string, data: UpdateAccountRequest): Promise<AccountResponse> {
    const payload = {
      name: data.name,
      type: data.type !== undefined ? resolveAccountType(data.type) : undefined,
      isArchived: data.isArchived,
    };
    return apiClient<AccountResponse>(`/api/v1/accounts/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async update(id: string, data: UpdateAccountRequest): Promise<AccountResponse> {
    return accountsApi.updateAccount(id, data);
  },

  async setDefaultAccount(id: string): Promise<AccountResponse> {
    return apiClient<AccountResponse>(`/api/v1/accounts/${id}/default`, {
      method: "PUT",
    });
  },

  async deleteAccount(id: string): Promise<void> {
    return apiClient<void>(`/api/v1/accounts/${id}`, {
      method: "DELETE",
    });
  },

  async delete(id: string): Promise<void> {
    return accountsApi.deleteAccount(id);
  },
};
