import { apiClient } from "./client";
import { SavingsGoalResponse } from "@/types/api";

export interface CreateSavingsGoalRequest {
  name: string;
  targetAmount: number;
  currencyCode: string;
  initialAmount?: number;
  targetDate?: string | null;
  accountId?: string | null;
}

export interface AdjustSavingsGoalRequest {
  amount: number;
  isWithdrawal: boolean;
}

export const savingsGoalsApi = {
  async getSavingsGoals(accountId?: string): Promise<SavingsGoalResponse[]> {
    const query = accountId ? `?accountId=${encodeURIComponent(accountId)}` : "";
    return apiClient<SavingsGoalResponse[]>(`/api/v1/savings-goals${query}`);
  },

  async createSavingsGoal(data: CreateSavingsGoalRequest): Promise<SavingsGoalResponse> {
    return apiClient<SavingsGoalResponse>("/api/v1/savings-goals", {
      method: "POST",
      body: JSON.stringify({
        name: data.name.trim(),
        targetAmount: data.targetAmount,
        currencyCode: data.currencyCode,
        initialAmount: data.initialAmount ?? 0,
        targetDate: data.targetDate || null,
        accountId: data.accountId || null,
      }),
    });
  },

  async adjustSavingsGoal(
    id: string,
    data: AdjustSavingsGoalRequest
  ): Promise<SavingsGoalResponse> {
    return apiClient<SavingsGoalResponse>(`/api/v1/savings-goals/${id}/adjust`, {
      method: "POST",
      body: JSON.stringify({
        amount: data.amount,
        isWithdrawal: data.isWithdrawal,
      }),
    });
  },

  async deleteSavingsGoal(id: string): Promise<void> {
    return apiClient<void>(`/api/v1/savings-goals/${id}`, {
      method: "DELETE",
    });
  },
};
