export interface ProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  traceId?: string;
  code?: string;
  errors?: Record<string, string[]>;
}

export interface PagedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface SystemStatusResponse {
  service: string;
  status: string;
  version: string;
  environment: string;
  databaseStatus: string;
  timestampUtc: string;
}

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

export enum CategoryType {
  Income = 1,
  Expense = 2,
}

export enum RecurrenceFrequency {
  Daily = 1,
  Weekly = 2,
  Monthly = 3,
  Yearly = 4,
}

export interface UserProfileResponse {
  id: string;
  email: string;
  fullName: string;
  defaultCurrencyCode: string;
  isEmailVerified?: boolean;
  twoFactorEnabled?: boolean;
  twoFactorType?: string;
}

export interface AuthResultResponse {
  id: string;
  email: string;
  fullName: string;
  defaultCurrencyCode: string;
  accessToken: string;
  expiresAtUtc: string;
  isEmailVerified: boolean;
  requiresTwoFactor: boolean;
  twoFactorType?: string;
  twoFactorToken?: string;
}

export interface TwoFactorSetupResponse {
  secretKey: string;
  qrCodeUri: string;
  recoveryCodes: string[];
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
}

export interface CategoryResponse {
  id: string;
  name: string;
  type: CategoryType;
  typeName: string;
  colorHex: string;
  isArchived: boolean;
  accountId?: string | null;
  accountName?: string | null;
}

export interface TransactionResponse {
  id: string;
  accountId: string;
  accountName: string;
  destinationAccountId?: string | null;
  destinationAccountName?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  categoryColorHex?: string | null;
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

export interface BudgetProgressResponse {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryColorHex: string;
  year: number;
  month: number;
  limitAmount: number;
  spentAmount: number;
  remainingAmount: number;
  utilizationPercent: number;
  currencyCode: string;
  isOverBudget: boolean;
  accountId?: string | null;
  accountName?: string | null;
}

export interface SavingsGoalResponse {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  remainingAmount: number;
  progressPercent: number;
  currencyCode: string;
  targetDate?: string | null;
  createdAtUtc: string;
  accountId?: string | null;
  accountName?: string | null;
}

export interface RecurringTransactionResponse {
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
  description: string;
  frequency: RecurrenceFrequency;
  frequencyName: string;
  nextOccurrenceDate: string;
  lastProcessedDate?: string | null;
  isActive: boolean;
}

export interface CurrencyCashFlowSummary {
  currencyCode: string;
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  monthlyNetCashFlow: number;
  monthlyTransfersVolume: number;
}

export interface ConsolidatedCashFlowSummary {
  baseCurrencyCode: string;
  convertedTotalBalance: number;
  convertedMonthlyIncome: number;
  convertedMonthlyExpense: number;
  convertedMonthlyNetCashFlow: number;
  convertedMonthlyTransfersVolume: number;
  exchangeRatesToBase: Record<string, number>;
}

export interface ExchangeRatesResponse {
  baseCurrency: string;
  isLiveFeedActive: boolean;
  rateSource: string;
  lastUpdatedUtc: string;
  unitsPerUsd: Record<string, number>;
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
  consolidated: ConsolidatedCashFlowSummary;
  currencySummaries: CurrencyCashFlowSummary[];
  budgets: BudgetProgressResponse[];
  savingsGoals: SavingsGoalResponse[];
  recentTransactions: TransactionResponse[];
  scopedAccount?: ScopedAccountSummary | null;
}

export interface CategoryBreakdownItem {
  categoryId?: string | null;
  categoryName: string;
  colorHex: string;
  currencyCode: string;
  totalAmount: number;
  sharePercent: number;
  transactionCount: number;
}

export interface CashFlowReportResponse {
  fromDate: string;
  toDate: string;
  currencyCode: string;
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  totalTransfersExcluded: number;
  savingsRatePercent: number;
  expenseByCategory: CategoryBreakdownItem[];
  incomeByCategory: CategoryBreakdownItem[];
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
}

export interface LendingSummaryResponse {
  totalLentRemaining: number;
  totalBorrowedRemaining: number;
  netPosition: number;
  currencyCode: string;
  activeLentCount: number;
  activeBorrowedCount: number;
  records: LendingRecordResponse[];
}

export interface CreateLendingRecordRequest {
  accountId: string;
  type: LendingType;
  counterparty: string;
  amount: number;
  dueDate?: string | null;
  notes?: string | null;
  syncAccountBalance?: boolean;
}

export interface RecordLendingPaymentRequest {
  amount: number;
  occurredOn: string;
  notes?: string | null;
  syncAccountBalance?: boolean;
}

export type NotificationType =
  | "System"
  | "SecurityAlert"
  | "BudgetWarning"
  | "SavingsGoalMilestone"
  | "LendingReminder"
  | "TransactionAlert"
  | "TransferCompleted";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: NotificationType | string;
  isRead: boolean;
  actionUrl?: string | null;
  createdAtUtc: string;
  readAtUtc?: string | null;
}

export interface NotificationsListResponse {
  items: NotificationItem[];
  unreadCount: number;
}

