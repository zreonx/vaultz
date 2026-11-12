using Microsoft.EntityFrameworkCore;
using Vaultz.Application.Common.Exceptions;
using Vaultz.Application.Common.Interfaces;
using Vaultz.Application.Features.Budgets;
using Vaultz.Application.Features.SavingsGoals;
using Vaultz.Application.Features.Transactions;
using Vaultz.Domain.Entities;
using Vaultz.Domain.Enums;
using Vaultz.Domain.ValueObjects;

namespace Vaultz.Application.Features.Dashboard;

public sealed record ScopedAccountSummary(
    Guid Id,
    string Name,
    string TypeName,
    string CurrencyCode,
    decimal Balance,
    decimal MonthlyIncome,
    decimal MonthlyExpense,
    decimal MonthlyNetCashFlow,
    decimal MonthlyTransfersVolume);

public sealed record CurrencyCashFlowSummary(
    string CurrencyCode,
    decimal TotalBalance,
    decimal MonthlyIncome,
    decimal MonthlyExpense,
    decimal MonthlyNetCashFlow,
    decimal MonthlyTransfersVolume);

public sealed record ConsolidatedCashFlowSummary(
    string BaseCurrencyCode,
    decimal ConvertedTotalBalance,
    decimal ConvertedMonthlyIncome,
    decimal ConvertedMonthlyExpense,
    decimal ConvertedMonthlyNetCashFlow,
    decimal ConvertedMonthlyTransfersVolume,
    IReadOnlyDictionary<string, decimal> ExchangeRatesToBase);

public sealed record DashboardSummaryResponse(
    int Year,
    int Month,
    int ActiveAccountsCount,
    ConsolidatedCashFlowSummary Consolidated,
    IReadOnlyList<CurrencyCashFlowSummary> CurrencySummaries,
    IReadOnlyList<BudgetProgressResponse> Budgets,
    IReadOnlyList<SavingsGoalResponse> SavingsGoals,
    IReadOnlyList<TransactionResponse> RecentTransactions,
    ScopedAccountSummary? ScopedAccount = null);

public sealed class DashboardHandlers
{
    private readonly IVaultzDbContext _dbContext;
    private readonly ICurrentUserService _currentUser;
    private readonly BudgetHandlers _budgetHandlers;
    private readonly SavingsGoalHandlers _savingsGoalHandlers;
    private readonly TransactionHandlers _transactionHandlers;

    public DashboardHandlers(
        IVaultzDbContext dbContext,
        ICurrentUserService currentUser,
        BudgetHandlers budgetHandlers,
        SavingsGoalHandlers savingsGoalHandlers,
        TransactionHandlers transactionHandlers)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
        _budgetHandlers = budgetHandlers;
        _savingsGoalHandlers = savingsGoalHandlers;
        _transactionHandlers = transactionHandlers;
    }

    public async Task<DashboardSummaryResponse> GetDashboardSummaryAsync(
        int? year = null,
        int? month = null,
        string? baseCurrency = null,
        Guid? accountId = null,
        CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var targetYear = year ?? today.Year;
        var targetMonth = month ?? today.Month;

        var periodStart = new DateOnly(targetYear, targetMonth, 1);
        var periodEnd = periodStart.AddMonths(1).AddDays(-1);

        var resolvedBaseCurrency = string.IsNullOrWhiteSpace(baseCurrency)
            ? "USD"
            : CurrencyCode.From(baseCurrency).Value;

        if (string.IsNullOrWhiteSpace(baseCurrency) && Guid.TryParse(userId, out var parsedUserId))
        {
            var userAccount = await _dbContext.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == parsedUserId, cancellationToken);
            if (userAccount is not null)
            {
                resolvedBaseCurrency = userAccount.DefaultCurrencyCode;
            }
        }

        List<FinancialAccount> accounts;
        ScopedAccountSummary? scopedAccountSummary = null;
        FinancialAccount? scopedAccount = null;

        if (accountId.HasValue)
        {
            scopedAccount = await _dbContext.Accounts
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == accountId.Value && a.UserId == userId && !a.IsArchived, cancellationToken);

            if (scopedAccount is null)
            {
                throw new NotFoundException("Account", accountId.Value);
            }

            if (string.IsNullOrWhiteSpace(baseCurrency))
            {
                resolvedBaseCurrency = scopedAccount.CurrencyCode;
            }

            accounts = [scopedAccount];
        }
        else
        {
            accounts = await _dbContext.Accounts
                .AsNoTracking()
                .Where(a => a.UserId == userId && !a.IsArchived)
                .ToListAsync(cancellationToken);
        }

        var monthTransactionsQuery = _dbContext.Transactions
            .AsNoTracking()
            .Where(t =>
                t.UserId == userId &&
                t.OccurredOn >= periodStart &&
                t.OccurredOn <= periodEnd);

        if (accountId.HasValue)
        {
            var accId = accountId.Value;
            monthTransactionsQuery = monthTransactionsQuery.Where(t =>
                t.AccountId == accId || t.DestinationAccountId == accId);
        }

        var monthTransactions = await monthTransactionsQuery.ToListAsync(cancellationToken);

        if (scopedAccount is not null)
        {
            var accId = scopedAccount.Id;
            var accIncome = monthTransactions
                .Where(t => t.AccountId == accId && t.Type == TransactionType.Income)
                .Sum(t => t.Amount);

            var accExpense = monthTransactions
                .Where(t => t.AccountId == accId && t.Type == TransactionType.Expense)
                .Sum(t => t.Amount);

            var accTransfers = monthTransactions
                .Where(t => (t.AccountId == accId || t.DestinationAccountId == accId) && t.Type == TransactionType.Transfer)
                .Sum(t => t.AccountId == accId ? t.Amount : (t.DestinationAmount ?? t.Amount));

            scopedAccountSummary = new ScopedAccountSummary(
                scopedAccount.Id,
                scopedAccount.Name,
                scopedAccount.Type.ToString(),
                scopedAccount.CurrencyCode,
                scopedAccount.Balance,
                accIncome,
                accExpense,
                accIncome - accExpense,
                accTransfers);
        }

        var currencies = accounts.Select(a => a.CurrencyCode)
            .Concat(monthTransactions.Select(t => t.CurrencyCode))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(c => c)
            .ToList();

        if (currencies.Count == 0)
        {
            currencies.Add(resolvedBaseCurrency);
        }

        // Transfers are strictly excluded from income and expense totals
        var currencySummaries = currencies.Select(currency =>
        {
            var totalBalance = accounts
                .Where(a => string.Equals(a.CurrencyCode, currency, StringComparison.OrdinalIgnoreCase))
                .Sum(a => a.Balance);

            var monthlyIncome = monthTransactions
                .Where(t => t.Type == TransactionType.Income &&
                            string.Equals(t.CurrencyCode, currency, StringComparison.OrdinalIgnoreCase))
                .Sum(t => t.Amount);

            var monthlyExpense = monthTransactions
                .Where(t => t.Type == TransactionType.Expense &&
                            string.Equals(t.CurrencyCode, currency, StringComparison.OrdinalIgnoreCase))
                .Sum(t => t.Amount);

            var monthlyTransfers = monthTransactions
                .Where(t => t.Type == TransactionType.Transfer &&
                            string.Equals(t.CurrencyCode, currency, StringComparison.OrdinalIgnoreCase))
                .Sum(t => t.Amount);

            return new CurrencyCashFlowSummary(
                currency,
                totalBalance,
                monthlyIncome,
                monthlyExpense,
                monthlyIncome - monthlyExpense,
                monthlyTransfers);
        }).ToList();

        // Consolidated summary converted into resolvedBaseCurrency using ExchangeRateCatalog
        var convertedBalance = currencySummaries.Sum(cs =>
            ExchangeRateCatalog.Convert(cs.TotalBalance, cs.CurrencyCode, resolvedBaseCurrency));
        var convertedIncome = currencySummaries.Sum(cs =>
            ExchangeRateCatalog.Convert(cs.MonthlyIncome, cs.CurrencyCode, resolvedBaseCurrency));
        var convertedExpense = currencySummaries.Sum(cs =>
            ExchangeRateCatalog.Convert(cs.MonthlyExpense, cs.CurrencyCode, resolvedBaseCurrency));
        var convertedTransfers = currencySummaries.Sum(cs =>
            ExchangeRateCatalog.Convert(cs.MonthlyTransfersVolume, cs.CurrencyCode, resolvedBaseCurrency));

        var consolidated = new ConsolidatedCashFlowSummary(
            resolvedBaseCurrency,
            convertedBalance,
            convertedIncome,
            convertedExpense,
            convertedIncome - convertedExpense,
            convertedTransfers,
            ExchangeRateCatalog.GetRatesToBase(resolvedBaseCurrency));

        var activePlansQuery = _dbContext.MonthlyBudgetPlans
            .Include(p => p.Slices)
            .AsNoTracking()
            .Where(p => p.UserId == userId && p.IsActive && !p.IsSwept && p.Year == targetYear && p.Month == targetMonth);

        if (accountId.HasValue)
        {
            activePlansQuery = activePlansQuery.Where(p => p.AccountId == accountId.Value);
        }

        var activePlans = await activePlansQuery.ToListAsync(cancellationToken);

        IReadOnlyList<BudgetProgressResponse> budgets;

        if (activePlans.Count > 0)
        {
            var accountDict = accounts.ToDictionary(a => a.Id);
            var sliceBudgets = new List<BudgetProgressResponse>();
            foreach (var plan in activePlans)
            {
                accountDict.TryGetValue(plan.AccountId, out var planAccount);
                var currency = planAccount?.CurrencyCode ?? resolvedBaseCurrency;
                var accName = planAccount?.Name ?? "Account";

                foreach (var slice in plan.Slices)
                {
                    sliceBudgets.Add(new BudgetProgressResponse(
                        slice.Id,
                        slice.CategoryId ?? Guid.Empty,
                        slice.Name,
                        slice.Color ?? "#6366f1",
                        plan.Year,
                        plan.Month,
                        slice.AllocatedAmount,
                        slice.SpentAmount,
                        slice.RemainingAmount,
                        slice.AllocatedAmount > 0 ? Math.Round((slice.SpentAmount / slice.AllocatedAmount) * 100, 2) : 0m,
                        currency,
                        slice.RemainingAmount <= 0,
                        plan.AccountId,
                        accName));
                }
            }
            budgets = sliceBudgets;
        }
        else
        {
            budgets = await _budgetHandlers.GetMonthlyBudgetsAsync(targetYear, targetMonth, accountId, cancellationToken);
        }

        var savingsGoals = await _savingsGoalHandlers.GetSavingsGoalsAsync(accountId, cancellationToken);
        var recentTransactions = await _transactionHandlers.GetTransactionsAsync(
            new GetTransactionsFilter(AccountId: accountId, Limit: 8),
            cancellationToken);

        return new DashboardSummaryResponse(
            targetYear,
            targetMonth,
            accounts.Count,
            consolidated,
            currencySummaries,
            budgets,
            savingsGoals,
            recentTransactions,
            scopedAccountSummary);
    }
}
