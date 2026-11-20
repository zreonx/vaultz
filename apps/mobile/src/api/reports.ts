import { apiClient } from "./client";
import { CashFlowReportResponse } from "@/types/api";

export interface CashFlowReportQuery {
  fromDate?: string;
  toDate?: string;
  currencyCode: string;
  accountId?: string;
}

export const reportsApi = {
  async getCashFlowReport(query: CashFlowReportQuery): Promise<CashFlowReportResponse> {
    const params = new URLSearchParams();
    if (query.fromDate) params.append("fromDate", query.fromDate);
    if (query.toDate) params.append("toDate", query.toDate);
    params.append("currencyCode", query.currencyCode || "USD");
    if (query.accountId) params.append("accountId", query.accountId);

    return apiClient<CashFlowReportResponse>(
      `/api/v1/reports/cash-flow?${params.toString()}`
    );
  },
};
