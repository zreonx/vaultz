export enum AccountType {
  Checking = 1,
  Savings = 2,
  Cash = 3,
  CreditCard = 4,
  Investment = 5,
}

export enum TransactionType {
  Income = 1,
  Expense = 2,
  Transfer = 3,
}

export enum LendingType {
  Lent = 1,
  Borrowed = 2,
}

export enum LendingStatus {
  Active = 1,
  Settled = 2,
  WrittenOff = 3,
}

export interface UserResponse {
  id: string;
  email: string;
  fullName: string;
  defaultCurrencyCode: string;
  createdAtUtc: string;
}

export interface AuthResponse {
  token: string;
  user: UserResponse;
}

export interface AccountResponse {
  id: string;
  name: string;
  type: AccountType;
  typeName: string;
  currencyCode: string;
  balance: number;
  isArchived: boolean;
  isDefault: boolean;
  createdAtUtc: string;
  // UI helpers
  currency?: string;
  currentBalance?: number;
}

export interface TransactionResponse {
  id: string;
  accountId: string;
  accountName: string;
  destinationAccountId?: string | null;
  destinationAccountName?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  type: TransactionType;
  typeName: string;
  amount: number;
  currencyCode: string;
  destinationAmount?: number | null;
  destinationCurrencyCode?: string | null;
  exchangeRate?: number | null;
  occurredOn: string;
  description: string;
  notes?: string | null;
  createdAtUtc: string;
  // UI helpers
  currency?: string;
  category?: string;
  transactionDate?: string;
}

export interface PagedTransactionsResponse {
  items: TransactionResponse[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface ScopedAccountSummary {
  id: string;
  name: string;
  typeName: string;
  currencyCode: string;
  balance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  monthlyNetCashFlow: number;
  monthlyTransfersVolume: number;
}

export interface DashboardSummaryResponse {
  year: number;
  month: number;
  activeAccountsCount: number;
  recentTransactions: TransactionResponse[];
  scopedAccount?: ScopedAccountSummary | null;
  consolidated?: any;
  totalBalance?: number;
  monthlyIncome?: number;
  monthlyExpenses?: number;
}

export interface LendingPaymentResponse {
  id: string;
  lendingRecordId: string;
  amount: number;
  currencyCode: string;
  occurredOn: string;
  notes?: string | null;
  createdAtUtc: string;
}

export interface LendingRecordResponse {
  id: string;
  accountId: string;
  accountName: string;
  type: LendingType;
  typeName: string;
  counterparty: string;
  originalAmount: number;
  remainingAmount: number;
  repaidAmount: number;
  progressPercent: number;
  currencyCode: string;
  dueDate?: string | null;
  notes?: string | null;
  status: LendingStatus;
  statusName: string;
  createdAtUtc: string;
  payments: LendingPaymentResponse[];
  // UI helpers
  borrowerOrLenderName?: string;
  totalAmount?: number;
  remainingBalance?: number;
  currency?: string;
}

export interface LendingSummaryResponse {
  totalLentRemaining: number;
  totalBorrowedRemaining: number;
  netPosition: number;
  currencyCode: string;
  activeLentCount: number;
  activeBorrowedCount: number;
  records: LendingRecordResponse[];
  // UI helpers
  totalLent?: number;
  totalBorrowed?: number;
}

// Aliases
export type AccountDto = AccountResponse;
export type TransactionDto = TransactionResponse;
export type LendingItemDto = LendingRecordResponse;
export type LendingSummaryDto = LendingSummaryResponse;
export type DashboardSummaryDto = DashboardSummaryResponse;
