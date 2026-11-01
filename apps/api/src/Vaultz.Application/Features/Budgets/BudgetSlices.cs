using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Vaultz.Application.Common.Exceptions;
using Vaultz.Application.Common.Interfaces;
using Vaultz.Domain.Common;
using Vaultz.Domain.Entities;
using Vaultz.Domain.Enums;

namespace Vaultz.Application.Features.Budgets;

public sealed record BudgetProgressResponse(
    Guid Id,
    Guid CategoryId,
    string CategoryName,
    string CategoryColorHex,
    int Year,
    int Month,
    decimal LimitAmount,
    decimal SpentAmount,
    decimal RemainingAmount,
    decimal UtilizationPercent,
    string CurrencyCode,
    bool IsOverBudget,
    Guid? AccountId = null,
    string? AccountName = null);

public sealed record UpsertBudgetCommand(
    Guid CategoryId,
    int Year,
    int Month,
    decimal LimitAmount,
    string CurrencyCode,
    Guid? AccountId = null);

public sealed class UpsertBudgetValidator : AbstractValidator<UpsertBudgetCommand>
{
    public UpsertBudgetValidator()
    {
        RuleFor(x => x.CategoryId).NotEmpty();
        RuleFor(x => x.Year).InclusiveBetween(2000, 2100);
        RuleFor(x => x.Month).InclusiveBetween(1, 12);
        RuleFor(x => x.LimitAmount).GreaterThan(0m);
        RuleFor(x => x.CurrencyCode)
            .NotEmpty()
            .Length(3)
            .Matches("^[A-Za-z]{3}$");
    }
}

public sealed class BudgetHandlers
{
    private readonly IVaultzDbContext _dbContext;
    private readonly ICurrentUserService _currentUser;
    private readonly IValidator<UpsertBudgetCommand> _upsertValidator;

    public BudgetHandlers(
        IVaultzDbContext dbContext,
        ICurrentUserService currentUser,
        IValidator<UpsertBudgetCommand> upsertValidator)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
        _upsertValidator = upsertValidator;
    }

    public async Task<IReadOnlyList<BudgetProgressResponse>> GetMonthlyBudgetsAsync(
        int year,
        int month,
        Guid? accountId = null,
        CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();

        var accounts = await _dbContext.Accounts
            .AsNoTracking()
            .Where(a => a.UserId == userId)
            .ToDictionaryAsync(a => a.Id, cancellationToken);

        string? accountCurrency = null;
        if (accountId.HasValue && accounts.TryGetValue(accountId.Value, out var selectedAccount))
        {
            accountCurrency = selectedAccount.CurrencyCode;
        }

        var query = _dbContext.Budgets
            .AsNoTracking()
            .Where(b => b.UserId == userId && b.Year == year && b.Month == month);

        if (accountId.HasValue)
        {
            query = query.Where(b => b.AccountId == accountId.Value || (b.AccountId == null && b.CurrencyCode == accountCurrency));
        }

        var budgets = await query.ToListAsync(cancellationToken);

        if (budgets.Count == 0)
        {
            return [];
        }

        var categories = await _dbContext.Categories
            .AsNoTracking()
            .Where(c => c.UserId == userId)
            .ToDictionaryAsync(c => c.Id, cancellationToken);

        var periodStart = new DateOnly(year, month, 1);
        var periodEnd = periodStart.AddMonths(1).AddDays(-1);

        // Transfers and Income are strictly excluded from budget expense calculations
        var expenseQuery = _dbContext.Transactions
            .AsNoTracking()
            .Where(t =>
                t.UserId == userId &&
                t.Type == TransactionType.Expense &&
                t.CategoryId != null &&
                t.OccurredOn >= periodStart &&
                t.OccurredOn <= periodEnd);

        if (accountId.HasValue)
        {
            expenseQuery = expenseQuery.Where(t => t.AccountId == accountId.Value);
        }

        var expensesInPeriod = await expenseQuery.ToListAsync(cancellationToken);

        return budgets
            .Select(budget =>
            {
                categories.TryGetValue(budget.CategoryId, out var category);

                var spent = expensesInPeriod
                    .Where(t =>
                        t.CategoryId == budget.CategoryId &&
                        (budget.AccountId == null || t.AccountId == budget.AccountId) &&
                        string.Equals(t.CurrencyCode, budget.CurrencyCode, StringComparison.OrdinalIgnoreCase))
                    .Sum(t => t.Amount);

                var remaining = budget.LimitAmount - spent;
                var utilization = budget.LimitAmount > 0m
                    ? decimal.Round((spent / budget.LimitAmount) * 100m, 2, MidpointRounding.ToEven)
                    : 0m;

                string? budgetAccountName = null;
                if (budget.AccountId.HasValue && accounts.TryGetValue(budget.AccountId.Value, out var acc))
                {
                    budgetAccountName = acc.Name;
                }

                return new BudgetProgressResponse(
                    budget.Id,
                    budget.CategoryId,
                    category?.Name ?? "Category",
                    category?.ColorHex ?? "#2A6B58",
                    budget.Year,
                    budget.Month,
                    budget.LimitAmount,
                    spent,
                    remaining,
                    utilization,
                    budget.CurrencyCode,
                    spent > budget.LimitAmount,
                    budget.AccountId,
                    budgetAccountName);
            })
            .OrderByDescending(b => b.UtilizationPercent)
            .ToList();
    }

    public async Task<BudgetProgressResponse> UpsertBudgetAsync(
        UpsertBudgetCommand command,
        CancellationToken cancellationToken = default)
    {
        var validation = await _upsertValidator.ValidateAsync(command, cancellationToken);
        if (!validation.IsValid)
        {
            throw new AppValidationException(validation.Errors);
        }

        var userId = _currentUser.GetRequiredUserId();
        var normalizedCurrency = command.CurrencyCode.Trim().ToUpperInvariant();

        if (command.AccountId.HasValue)
        {
            var account = await _dbContext.Accounts
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == command.AccountId.Value && a.UserId == userId, cancellationToken)
                ?? throw new NotFoundException(nameof(FinancialAccount), command.AccountId.Value);

            if (!string.Equals(account.CurrencyCode, normalizedCurrency, StringComparison.OrdinalIgnoreCase))
            {
                throw new DomainException($"Budget currency must match the account currency ({account.CurrencyCode}).", "invalid_budget_currency");
            }
        }

        var category = await _dbContext.Categories
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == command.CategoryId && c.UserId == userId, cancellationToken)
            ?? throw new NotFoundException(nameof(Category), command.CategoryId);

        if (category.Type != CategoryType.Expense)
        {
            throw new DomainException("Budgets can only be assigned to Expense categories.", "invalid_budget_category");
        }

        var existing = await _dbContext.Budgets
            .FirstOrDefaultAsync(
                b => b.UserId == userId &&
                     b.CategoryId == command.CategoryId &&
                     b.Year == command.Year &&
                     b.Month == command.Month &&
                     b.AccountId == command.AccountId &&
                     b.CurrencyCode == normalizedCurrency,
                cancellationToken);

        if (existing is null)
        {
            existing = new Budget(
                userId,
                command.CategoryId,
                command.Year,
                command.Month,
                command.LimitAmount,
                normalizedCurrency,
                command.AccountId);
            _dbContext.Budgets.Add(existing);
        }
        else
        {
            existing.UpdateLimit(command.LimitAmount);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        var updatedList = await GetMonthlyBudgetsAsync(command.Year, command.Month, command.AccountId, cancellationToken);
        return updatedList.First(b => b.Id == existing.Id);
    }

    public async Task DeleteBudgetAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();
        var budget = await _dbContext.Budgets
            .FirstOrDefaultAsync(b => b.Id == id && b.UserId == userId, cancellationToken)
            ?? throw new NotFoundException(nameof(Budget), id);

        _dbContext.Budgets.Remove(budget);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
