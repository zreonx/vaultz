import { apiClient } from "./client";
import {
  TransactionResponse,
  TransactionType,
  PagedTransactionsResponse,
} from "@/types/api";

export interface CreateTransactionRequest {
  accountId: string;
  destinationAccountId?: string | null;
  categoryId?: string | null;
  category?: string;
  type: TransactionType | 'Expense' | 'Income' | 'Transfer' | string;
  amount: number;
  destinationAmount?: number | null;
  currency?: string;
  occurredOn?: string;
  transactionDate?: string;
  description?: string;
  notes?: string | null;
}

export interface ListTransactionsFilter {
  accountId?: string;
  type?: TransactionType | 'Expense' | 'Income' | 'Transfer' | string;
  searchTerm?: string;
  page?: number;
  pageSize?: number;
}

function resolveTransactionType(
  type?: TransactionType | 'Expense' | 'Income' | 'Transfer' | string
): TransactionType | undefined {
  if (type === undefined) return undefined;
  if (typeof type === 'number') return type;
  const lower = String(type).toLowerCase();
  if (lower.includes('income')) return TransactionType.Income;
  if (lower.includes('transfer')) return TransactionType.Transfer;
  return TransactionType.Expense;
}

export const transactionsApi = {
  async getTransactions(
    accountId?: string,
    type?: TransactionType | string
  ): Promise<TransactionResponse[]> {
    const params = new URLSearchParams();
    if (accountId) params.append("accountId", accountId);
    const resolvedType = resolveTransactionType(type);
    if (resolvedType !== undefined) params.append("type", String(resolvedType));

    const query = params.toString();
    const endpoint = query ? `/api/v1/transactions?${query}` : "/api/v1/transactions";
    const items = await apiClient<TransactionResponse[]>(endpoint);
    return items.map((tx) => ({
      ...tx,
      currency: tx.currencyCode,
      category: tx.categoryName || tx.description || 'Uncategorized',
      transactionDate: tx.occurredOn || tx.createdAtUtc,
    }));
  },

  async list(filter: ListTransactionsFilter = {}): Promise<PagedTransactionsResponse> {
    const params = new URLSearchParams();
    if (filter.accountId) params.append("accountId", filter.accountId);
    const resolvedType = resolveTransactionType(filter.type);
    if (resolvedType !== undefined) params.append("type", String(resolvedType));
    if (filter.searchTerm) params.append("search", filter.searchTerm);
    if (filter.page) params.append("page", String(filter.page));
    if (filter.pageSize) params.append("pageSize", String(filter.pageSize));

    const query = params.toString();
    const endpoint = query ? `/api/v1/transactions?${query}` : "/api/v1/transactions";
    const items = await apiClient<TransactionResponse[]>(endpoint);
    const mapped = (items || []).map((tx) => ({
      ...tx,
      currency: tx.currencyCode,
      category: tx.categoryName || tx.description || 'General',
      transactionDate: tx.occurredOn || tx.createdAtUtc,
    }));

    return {
      items: mapped,
      page: filter.page || 1,
      pageSize: filter.pageSize || 50,
      totalCount: mapped.length,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
    };
  },

  async createTransaction(data: CreateTransactionRequest): Promise<TransactionResponse> {
    const payload = {
      accountId: data.accountId,
      destinationAccountId: data.destinationAccountId || null,
      categoryId: data.categoryId || null,
      type: resolveTransactionType(data.type) ?? TransactionType.Expense,
      amount: data.amount,
      destinationAmount: data.destinationAmount || null,
      occurredOn: data.occurredOn || data.transactionDate || new Date().toISOString().split('T')[0],
      description: data.description || data.category || 'Transaction',
      notes: data.notes || null,
    };

    return apiClient<TransactionResponse>("/api/v1/transactions", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async create(data: CreateTransactionRequest): Promise<TransactionResponse> {
    return transactionsApi.createTransaction(data);
  },

  async deleteTransaction(id: string): Promise<void> {
    return apiClient<void>(`/api/v1/transactions/${id}`, {
      method: "DELETE",
    });
  },
};
