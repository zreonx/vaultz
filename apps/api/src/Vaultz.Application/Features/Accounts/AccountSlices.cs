using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Vaultz.Application.Common.Exceptions;
using Vaultz.Application.Common.Interfaces;
using Vaultz.Domain.Common;
using Vaultz.Domain.Entities;
using Vaultz.Domain.Enums;

namespace Vaultz.Application.Features.Accounts;

public sealed record AccountResponse(
    Guid Id,
    string Name,
    AccountType Type,
    string TypeName,
    string CurrencyCode,
    decimal Balance,
    bool IsArchived,
    bool IsDefault,
    DateTimeOffset CreatedAtUtc);

public sealed record CreateAccountCommand(
    string Name,
    AccountType Type,
    string CurrencyCode,
    decimal InitialBalance,
    bool IsDefault = false);

public sealed class CreateAccountValidator : AbstractValidator<CreateAccountCommand>
{
    public CreateAccountValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Type).IsInEnum();
        RuleFor(x => x.CurrencyCode)
            .NotEmpty()
            .Length(3)
            .Matches("^[A-Za-z]{3}$")
            .WithMessage("Currency code must be a 3-letter ISO 4217 code.");
    }
}

public sealed record UpdateAccountCommand(
    Guid Id,
    string Name,
    AccountType? Type = null,
    bool? IsArchived = null);

public sealed class UpdateAccountValidator : AbstractValidator<UpdateAccountCommand>
{
    public UpdateAccountValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Type!.Value).IsInEnum().When(x => x.Type.HasValue);
    }
}

public sealed class AccountHandlers
{
    private readonly IVaultzDbContext _dbContext;
    private readonly ICurrentUserService _currentUser;
    private readonly IValidator<CreateAccountCommand> _createValidator;
    private readonly IValidator<UpdateAccountCommand> _updateValidator;

    public AccountHandlers(
        IVaultzDbContext dbContext,
        ICurrentUserService currentUser,
        IValidator<CreateAccountCommand> createValidator,
        IValidator<UpdateAccountCommand> updateValidator)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
    }

    public async Task<IReadOnlyList<AccountResponse>> GetAccountsAsync(
        bool includeArchived = false,
        CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();

        var query = _dbContext.Accounts
            .AsNoTracking()
            .Where(a => a.UserId == userId);

        if (!includeArchived)
        {
            query = query.Where(a => !a.IsArchived);
        }

        var accounts = await query
            .OrderBy(a => a.Name)
            .ToListAsync(cancellationToken);

        return accounts.Select(MapToResponse).ToList();
    }

    public async Task<AccountResponse> CreateAccountAsync(
        CreateAccountCommand command,
        CancellationToken cancellationToken = default)
    {
        var validation = await _createValidator.ValidateAsync(command, cancellationToken);
        if (!validation.IsValid)
        {
            throw new AppValidationException(validation.Errors);
        }

        var userId = _currentUser.GetRequiredUserId();
        var anyExisting = await _dbContext.Accounts.AnyAsync(a => a.UserId == userId && !a.IsArchived, cancellationToken);
        var shouldBeDefault = command.IsDefault || !anyExisting;

        if (shouldBeDefault && anyExisting)
        {
            var existingDefaults = await _dbContext.Accounts
                .Where(a => a.UserId == userId && a.IsDefault)
                .ToListAsync(cancellationToken);

            foreach (var acc in existingDefaults)
            {
                acc.RemoveDefault();
            }
        }

        var account = new FinancialAccount(
            userId,
            command.Name,
            command.Type,
            command.CurrencyCode,
            command.InitialBalance,
            isDefault: shouldBeDefault);

        _dbContext.Accounts.Add(account);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return MapToResponse(account);
    }

    public async Task<AccountResponse> SetDefaultAccountAsync(
        Guid accountId,
        CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();
        var accounts = await _dbContext.Accounts
            .Where(a => a.UserId == userId)
            .ToListAsync(cancellationToken);

        var targetAccount = accounts.FirstOrDefault(a => a.Id == accountId)
            ?? throw new NotFoundException(nameof(FinancialAccount), accountId);

        if (targetAccount.IsArchived)
        {
            throw new DomainException("Cannot set an archived account as default.", "invalid_account_state");
        }

        foreach (var acc in accounts)
        {
            if (acc.Id == accountId)
            {
                acc.SetAsDefault();
            }
            else if (acc.IsDefault)
            {
                acc.RemoveDefault();
            }
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return MapToResponse(targetAccount);
    }

    public async Task<AccountResponse> UpdateAccountAsync(
        UpdateAccountCommand command,
        CancellationToken cancellationToken = default)
    {
        var validation = await _updateValidator.ValidateAsync(command, cancellationToken);
        if (!validation.IsValid)
        {
            throw new AppValidationException(validation.Errors);
        }

        var userId = _currentUser.GetRequiredUserId();
        var account = await _dbContext.Accounts
            .FirstOrDefaultAsync(a => a.Id == command.Id && a.UserId == userId, cancellationToken)
            ?? throw new NotFoundException(nameof(FinancialAccount), command.Id);

        var newType = command.Type ?? account.Type;
        var newIsArchived = command.IsArchived ?? account.IsArchived;
        account.UpdateDetails(command.Name, newType, newIsArchived);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return MapToResponse(account);
    }

    public async Task DeleteAccountAsync(
        Guid accountId,
        CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();

        await _dbContext.ExecuteInTransactionAsync(async ct =>
        {
            var account = await _dbContext.Accounts
                .FirstOrDefaultAsync(a => a.Id == accountId && a.UserId == userId, ct)
                ?? throw new NotFoundException(nameof(FinancialAccount), accountId);

            var totalAccounts = await _dbContext.Accounts
                .CountAsync(a => a.UserId == userId, ct);

            if (totalAccounts <= 1)
            {
                throw new DomainException("You cannot delete your only account. Vaultz requires at least one account.", "cannot_delete_only_account");
            }

            // If deleting the default account, reassign default status to another account
            if (account.IsDefault)
            {
                var nextDefault = await _dbContext.Accounts
                    .Where(a => a.UserId == userId && a.Id != accountId && !a.IsArchived)
                    .OrderBy(a => a.CreatedAtUtc)
                    .FirstOrDefaultAsync(ct)
                    ?? await _dbContext.Accounts
                        .Where(a => a.UserId == userId && a.Id != accountId)
                        .OrderBy(a => a.CreatedAtUtc)
                        .FirstOrDefaultAsync(ct);

                nextDefault?.SetAsDefault();
            }

            // Clean up dependent account-scoped allocations and budget plans
            var allocations = await _dbContext.AccountAllocations
                .Where(a => a.AccountId == accountId && a.UserId == userId)
                .ToListAsync(ct);
            _dbContext.AccountAllocations.RemoveRange(allocations);

            var budgetPlans = await _dbContext.MonthlyBudgetPlans
                .Include(p => p.Slices)
                .Where(p => p.AccountId == accountId && p.UserId == userId)
                .ToListAsync(ct);
            _dbContext.MonthlyBudgetPlans.RemoveRange(budgetPlans);

            var budgets = await _dbContext.Budgets
                .Where(b => b.AccountId == accountId && b.UserId == userId)
                .ToListAsync(ct);
            _dbContext.Budgets.RemoveRange(budgets);

            var scopedCategories = await _dbContext.Categories
                .Where(c => c.AccountId == accountId && c.UserId == userId)
                .ToListAsync(ct);
            _dbContext.Categories.RemoveRange(scopedCategories);

            var scopedGoals = await _dbContext.SavingsGoals
                .Where(s => s.AccountId == accountId && s.UserId == userId)
                .ToListAsync(ct);
            _dbContext.SavingsGoals.RemoveRange(scopedGoals);

            var recurrings = await _dbContext.RecurringTransactions
                .Where(r => (r.AccountId == accountId || r.DestinationAccountId == accountId) && r.UserId == userId)
                .ToListAsync(ct);
            _dbContext.RecurringTransactions.RemoveRange(recurrings);

            var lendings = await _dbContext.LendingRecords
                .Include(l => l.Payments)
                .Where(l => l.AccountId == accountId && l.UserId == userId)
                .ToListAsync(ct);
            _dbContext.LendingRecords.RemoveRange(lendings);

            var transactions = await _dbContext.Transactions
                .Where(t => (t.AccountId == accountId || t.DestinationAccountId == accountId) && t.UserId == userId)
                .ToListAsync(ct);
            _dbContext.Transactions.RemoveRange(transactions);

            _dbContext.Accounts.Remove(account);

            await _dbContext.SaveChangesAsync(ct);
        }, cancellationToken);
    }

    private static AccountResponse MapToResponse(FinancialAccount account) =>
        new(
            account.Id,
            account.Name,
            account.Type,
            account.Type.ToString(),
            account.CurrencyCode,
            account.Balance,
            account.IsArchived,
            account.IsDefault,
            account.CreatedAtUtc);
}
