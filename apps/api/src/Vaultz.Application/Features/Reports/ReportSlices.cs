using System.Globalization;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Vaultz.Application.Common.Interfaces;
using Vaultz.Domain.Entities;
using Vaultz.Domain.Enums;
using Vaultz.Domain.ValueObjects;

namespace Vaultz.Application.Features.Reports;

public sealed record CategoryBreakdownItem(
    Guid? CategoryId,
    string CategoryName,
    string ColorHex,
    string CurrencyCode,
    decimal TotalAmount,
    decimal SharePercent,
    int TransactionCount);

public sealed record CashFlowReportResponse(
    DateOnly FromDate,
    DateOnly ToDate,
    string CurrencyCode,
    decimal TotalIncome,
    decimal TotalExpense,
    decimal NetCashFlow,
    decimal TotalTransfersExcluded,
    decimal SavingsRatePercent,
    IReadOnlyList<CategoryBreakdownItem> ExpenseByCategory,
    IReadOnlyList<CategoryBreakdownItem> IncomeByCategory);

public sealed class ReportHandlers
{
    private readonly IVaultzDbContext _dbContext;
    private readonly ICurrentUserService _currentUser;

    public ReportHandlers(
        IVaultzDbContext dbContext,
        ICurrentUserService currentUser)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
    }

    public async Task<CashFlowReportResponse> GetCashFlowReportAsync(
        DateOnly? fromDate = null,
        DateOnly? toDate = null,
        string currencyCode = "USD",
        Guid? accountId = null,
        CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var start = fromDate ?? new DateOnly(today.Year, today.Month, 1);
        var end = toDate ?? today;
        var normalizedCurrency = string.IsNullOrWhiteSpace(currencyCode)
            ? "USD"
            : CurrencyCode.From(currencyCode).Value;

        var query = _dbContext.Transactions
            .AsNoTracking()
            .Where(t =>
                t.UserId == userId &&
                t.OccurredOn >= start &&
                t.OccurredOn <= end);

        if (accountId.HasValue)
        {
            query = query.Where(t => t.AccountId == accountId.Value || t.DestinationAccountId == accountId.Value);
        }

        var transactions = await query.ToListAsync(cancellationToken);

        var categories = await _dbContext.Categories
            .AsNoTracking()
            .Where(c => c.UserId == userId)
            .ToDictionaryAsync(c => c.Id, cancellationToken);

        var totalIncome = transactions
            .Where(t => t.Type == TransactionType.Income)
            .Sum(t => ExchangeRateCatalog.Convert(t.Amount, t.CurrencyCode, normalizedCurrency));

        var totalExpense = transactions
            .Where(t => t.Type == TransactionType.Expense)
            .Sum(t => ExchangeRateCatalog.Convert(t.Amount, t.CurrencyCode, normalizedCurrency));

        // Transfers are explicitly reported separately and never mixed into income or expense
        var totalTransfers = transactions
            .Where(t => t.Type == TransactionType.Transfer)
            .Sum(t => ExchangeRateCatalog.Convert(t.Amount, t.CurrencyCode, normalizedCurrency));

        var netCashFlow = totalIncome - totalExpense;
        var savingsRate = totalIncome > 0m
            ? decimal.Round((netCashFlow / totalIncome) * 100m, 2, MidpointRounding.ToEven)
            : 0m;

        var expenseBreakdown = BuildBreakdown(
            transactions.Where(t => t.Type == TransactionType.Expense),
            totalExpense,
            normalizedCurrency,
            categories);

        var incomeBreakdown = BuildBreakdown(
            transactions.Where(t => t.Type == TransactionType.Income),
            totalIncome,
            normalizedCurrency,
            categories);

        return new CashFlowReportResponse(
            start,
            end,
            normalizedCurrency,
            totalIncome,
            totalExpense,
            netCashFlow,
            totalTransfers,
            savingsRate,
            expenseBreakdown,
            incomeBreakdown);
    }

    public async Task<string> ExportTransactionsCsvAsync(
        DateOnly? fromDate = null,
        DateOnly? toDate = null,
        Guid? accountId = null,
        CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();

        var query = _dbContext.Transactions
            .AsNoTracking()
            .Where(t => t.UserId == userId);

        if (accountId.HasValue)
        {
            query = query.Where(t => t.AccountId == accountId.Value || t.DestinationAccountId == accountId.Value);
        }

        if (fromDate.HasValue)
        {
            query = query.Where(t => t.OccurredOn >= fromDate.Value);
        }

        if (toDate.HasValue)
        {
            query = query.Where(t => t.OccurredOn <= toDate.Value);
        }

        var transactions = await query
            .OrderByDescending(t => t.OccurredOn)
            .ThenByDescending(t => t.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        var accounts = await _dbContext.Accounts
            .AsNoTracking()
            .Where(a => a.UserId == userId)
            .ToDictionaryAsync(a => a.Id, cancellationToken);

        var categories = await _dbContext.Categories
            .AsNoTracking()
            .Where(c => c.UserId == userId)
            .ToDictionaryAsync(c => c.Id, cancellationToken);

        var sb = new StringBuilder();
        sb.AppendLine("Date,Type,Account,DestinationAccount,Category,Amount,Currency,DestinationAmount,DestinationCurrency,ExchangeRate,Description,Notes");

        foreach (var t in transactions)
        {
            accounts.TryGetValue(t.AccountId, out var source);
            FinancialAccount? dest = null;
            if (t.DestinationAccountId.HasValue)
            {
                accounts.TryGetValue(t.DestinationAccountId.Value, out dest);
            }

            Category? category = null;
            if (t.CategoryId.HasValue)
            {
                categories.TryGetValue(t.CategoryId.Value, out category);
            }

            sb.AppendLine(string.Join(",",
                t.OccurredOn.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                t.Type.ToString(),
                EscapeCsv(source?.Name ?? ""),
                EscapeCsv(dest?.Name ?? ""),
                EscapeCsv(category?.Name ?? ""),
                t.Amount.ToString("0.0000", CultureInfo.InvariantCulture),
                t.CurrencyCode,
                t.DestinationAmount?.ToString("0.0000", CultureInfo.InvariantCulture) ?? "",
                t.DestinationCurrencyCode ?? "",
                t.ExchangeRate?.ToString("0.000000", CultureInfo.InvariantCulture) ?? "",
                EscapeCsv(t.Description),
                EscapeCsv(t.Notes ?? "")));
        }

        return sb.ToString();
    }

    private static IReadOnlyList<CategoryBreakdownItem> BuildBreakdown(
        IEnumerable<FinancialTransaction> items,
        decimal grandTotal,
        string currencyCode,
        IReadOnlyDictionary<Guid, Category> categories)
    {
        return items
            .GroupBy(t => t.CategoryId)
            .Select(group =>
            {
                Category? cat = null;
                if (group.Key.HasValue)
                {
                    categories.TryGetValue(group.Key.Value, out cat);
                }

                var sum = group.Sum(t => ExchangeRateCatalog.Convert(t.Amount, t.CurrencyCode, currencyCode));
                var share = grandTotal > 0m
                    ? decimal.Round((sum / grandTotal) * 100m, 2, MidpointRounding.ToEven)
                    : 0m;

                return new CategoryBreakdownItem(
                    group.Key,
                    cat?.Name ?? "Uncategorized",
                    cat?.ColorHex ?? "#6E6A63",
                    currencyCode,
                    sum,
                    share,
                    group.Count());
            })
            .OrderByDescending(x => x.TotalAmount)
            .ToList();
    }

    private static string EscapeCsv(string value)
    {
        if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
        {
            return $"\"{value.Replace("\"", "\"\"")}\"";
        }

        return value;
    }
}
