import { apiClient } from "./client";
import {
  RecurrenceFrequency,
  RecurringTransactionResponse,
  TransactionType,
} from "@/types/api";

export interface CreateRecurringTransactionRequest {
  accountId: string;
  destinationAccountId?: string | null;
  categoryId?: string | null;
  type: TransactionType;
  amount: number;
  description: string;
  frequency: RecurrenceFrequency;
  nextOccurrenceDate: string;
}

export interface UpdateRecurringTransactionRequest
  extends CreateRecurringTransactionRequest {
  isActive: boolean;
}

export const recurringApi = {
  async getRecurring(accountId?: string): Promise<RecurringTransactionResponse[]> {
    const query = accountId ? `?accountId=${encodeURIComponent(accountId)}` : "";
    return apiClient<RecurringTransactionResponse[]>(
      `/api/v1/recurring-transactions${query}`
    );
  },

  async createRecurring(
    data: CreateRecurringTransactionRequest
  ): Promise<RecurringTransactionResponse> {
    return apiClient<RecurringTransactionResponse>("/api/v1/recurring-transactions", {
      method: "POST",
      body: JSON.stringify({
        accountId: data.accountId,
        destinationAccountId: data.destinationAccountId || null,
        categoryId: data.categoryId || null,
        type: data.type,
        amount: data.amount,
        description: data.description.trim(),
        frequency: data.frequency,
        nextOccurrenceDate: data.nextOccurrenceDate,
      }),
    });
  },

  async updateRecurring(
    id: string,
    data: UpdateRecurringTransactionRequest
  ): Promise<RecurringTransactionResponse> {
    return apiClient<RecurringTransactionResponse>(
      `/api/v1/recurring-transactions/${id}`,
      {
        method: "PUT",
        body: JSON.stringify({
          accountId: data.accountId,
          destinationAccountId: data.destinationAccountId || null,
          categoryId: data.categoryId || null,
          type: data.type,
          amount: data.amount,
          description: data.description.trim(),
          frequency: data.frequency,
          nextOccurrenceDate: data.nextOccurrenceDate,
          isActive: data.isActive,
        }),
      }
    );
  },

  async processOccurrence(id: string): Promise<RecurringTransactionResponse> {
    return apiClient<RecurringTransactionResponse>(
      `/api/v1/recurring-transactions/${id}/process`,
      {
        method: "POST",
      }
    );
  },

  async deleteRecurring(id: string): Promise<void> {
    return apiClient<void>(`/api/v1/recurring-transactions/${id}`, {
      method: "DELETE",
    });
  },
};
