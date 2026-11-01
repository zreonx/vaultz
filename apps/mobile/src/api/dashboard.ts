import { apiClient } from "./client";
import { DashboardSummaryResponse } from "@/types/api";

export const dashboardApi = {
  async getSummary(accountId?: string, baseCurrency = "USD"): Promise<DashboardSummaryResponse> {
    const params = new URLSearchParams({ baseCurrency });
    if (accountId) {
      params.append("accountId", accountId);
    }
    const res = await apiClient<DashboardSummaryResponse>(`/api/v1/dashboard?${params.toString()}`);

    // Flatten convenience metrics for easy UI consumption
    const totalBalance = res.scopedAccount
      ? res.scopedAccount.balance
      : res.consolidated?.convertedTotalBalance ?? 0;

    const monthlyIncome = res.scopedAccount
      ? res.scopedAccount.monthlyIncome
      : res.consolidated?.convertedMonthlyIncome ?? 0;

    const monthlyExpenses = res.scopedAccount
      ? res.scopedAccount.monthlyExpense
      : res.consolidated?.convertedMonthlyExpense ?? 0;

    return {
      ...res,
      totalBalance,
      monthlyIncome,
      monthlyExpenses,
    };
  },
};
