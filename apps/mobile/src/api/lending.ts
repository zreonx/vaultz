import { apiClient } from "./client";
import {
  LendingRecordResponse,
  LendingStatus,
  LendingSummaryResponse,
  LendingType,
} from "@/types/api";

export interface CreateLendingRequest {
  accountId: string;
  type: LendingType | 'Lent' | 'Borrowed' | string;
  counterparty?: string;
  borrowerOrLenderName?: string;
  amount?: number;
  totalAmount?: number;
  currency?: string;
  dueDate?: string | null;
  notes?: string | null;
  syncAccountBalance?: boolean;
}

export interface RecordLendingPaymentRequest {
  amount: number;
  repaymentDate?: string;
  occurredOn?: string;
  notes?: string | null;
  syncAccountBalance?: boolean;
}

function resolveLendingType(type: LendingType | 'Lent' | 'Borrowed' | string): LendingType {
  if (typeof type === 'number') return type;
  if (String(type).toLowerCase().includes('borrow')) return LendingType.Borrowed;
  return LendingType.Lent;
}

function mapLendingRecord(rec: LendingRecordResponse): LendingRecordResponse {
  return {
    ...rec,
    borrowerOrLenderName: rec.counterparty,
    totalAmount: rec.originalAmount,
    remainingBalance: rec.remainingAmount,
    currency: rec.currencyCode,
  };
}

export const lendingApi = {
  async getSummary(accountId?: string, status?: LendingStatus | string): Promise<LendingSummaryResponse> {
    const params = new URLSearchParams();
    if (accountId) params.append("accountId", accountId);
    if (status !== undefined) params.append("status", String(status));

    const query = params.toString();
    const endpoint = query ? `/api/v1/lending?${query}` : "/api/v1/lending";
    const res = await apiClient<LendingSummaryResponse>(endpoint);

    return {
      ...res,
      totalLent: res.totalLentRemaining ?? 0,
      totalBorrowed: res.totalBorrowedRemaining ?? 0,
      records: (res.records || []).map(mapLendingRecord),
    };
  },

  async list(filter: { accountId?: string; type?: string; status?: string } = {}): Promise<LendingRecordResponse[]> {
    const summary = await lendingApi.getSummary(filter.accountId);
    let records = summary.records || [];

    if (filter.type) {
      const typeLower = filter.type.toLowerCase();
      records = records.filter((r) => (r.typeName || '').toLowerCase().includes(typeLower));
    }

    if (filter.status) {
      const statusLower = filter.status.toLowerCase();
      records = records.filter((r) => (r.statusName || '').toLowerCase().includes(statusLower));
    }

    return records;
  },

  async createRecord(data: CreateLendingRequest): Promise<LendingRecordResponse> {
    const payload = {
      accountId: data.accountId,
      type: resolveLendingType(data.type),
      counterparty: data.counterparty || data.borrowerOrLenderName || "Contact",
      amount: data.amount ?? data.totalAmount ?? 0,
      dueDate: data.dueDate ? data.dueDate.split('T')[0] : null,
      notes: data.notes || null,
      syncAccountBalance: data.syncAccountBalance ?? false,
    };

    return apiClient<LendingRecordResponse>("/api/v1/lending", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async create(data: CreateLendingRequest): Promise<LendingRecordResponse> {
    return lendingApi.createRecord(data);
  },

  async recordPayment(id: string, data: RecordLendingPaymentRequest): Promise<void> {
    const payload = {
      amount: data.amount,
      occurredOn: (data.occurredOn || data.repaymentDate || new Date().toISOString()).split('T')[0],
      notes: data.notes || null,
      syncAccountBalance: data.syncAccountBalance ?? false,
    };

    return apiClient<void>(`/api/v1/lending/${id}/payments`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async logRepayment(id: string, data: RecordLendingPaymentRequest): Promise<void> {
    return lendingApi.recordPayment(id, data);
  },

  async settle(id: string): Promise<void> {
    return apiClient<void>(`/api/v1/lending/${id}/settle`, {
      method: "PUT",
    });
  },
};
