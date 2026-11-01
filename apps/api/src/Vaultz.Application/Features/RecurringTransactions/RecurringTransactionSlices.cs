using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Vaultz.Application.Common.Exceptions;
using Vaultz.Application.Common.Interfaces;
using Vaultz.Domain.Entities;
using Vaultz.Domain.Enums;

namespace Vaultz.Application.Features.RecurringTransactions;

public sealed record RecurringTransactionResponse(
    Guid Id,
    Guid AccountId,
    string AccountName,
    Guid? DestinationAccountId,
    string? DestinationAccountName,
    Guid? CategoryId,
    string? CategoryName,
    TransactionType Type,
    string TypeName,
    decimal Amount,
    string CurrencyCode,
    string Description,
    RecurrenceFrequency Frequency,
    string FrequencyName,
    DateOnly NextOccurrenceDate,
    DateOnly? LastProcessedDate,
    bool IsActive);

public sealed record CreateRecurringTransactionCommand(
    Guid AccountId,
    Guid? DestinationAccountId,
    Guid? CategoryId,
    TransactionType Type,
    decimal Amount,
    string Description,
    RecurrenceFrequency Frequency,
    DateOnly NextOccurrenceDate);

public sealed class CreateRecurringTransactionValidator : AbstractValidator<CreateRecurringTransactionCommand>
{
    public CreateRecurringTransactionValidator()
    {
        RuleFor(x => x.AccountId).NotEmpty();
        RuleFor(x => x.Type).IsInEnum();
        RuleFor(x => x.Amount).GreaterThan(0m);
        RuleFor(x => x.Description).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Frequency).IsInEnum();
    }
}

public sealed class RecurringTransactionHandlers
{
    private readonly IVaultzDbContext _dbContext;
    private readonly ICurrentUserService _currentUser;
    private readonly IValidator<CreateRecurringTransactionCommand> _createValidator;

    public RecurringTransactionHandlers(
        IVaultzDbContext dbContext,
        ICurrentUserService currentUser,
        IValidator<CreateRecurringTransactionCommand> createValidator)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
        _createValidator = createValidator;
    }

    public async Task<IReadOnlyList<RecurringTransactionResponse>> GetRecurringTransactionsAsync(
        Guid? accountId = null,
        CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();

        var query = _dbContext.RecurringTransactions
            .AsNoTracking()
            .Where(r => r.UserId == userId);

        if (accountId.HasValue)
        {
            query = query.Where(r => r.AccountId == accountId.Value || r.DestinationAccountId == accountId.Value);
        }

        var items = await query
            .OrderBy(r => r.NextOccurrenceDate)
            .ToListAsync(cancellationToken);

        var accounts = await _dbContext.Accounts
            .AsNoTracking()
            .Where(a => a.UserId == userId)
            .ToDictionaryAsync(a => a.Id, cancellationToken);

        var categories = await _dbContext.Categories
            .AsNoTracking()
            .Where(c => c.UserId == userId)
            .ToDictionaryAsync(c => c.Id, cancellationToken);

        return items.Select(r => MapToResponse(r, accounts, categories)).ToList();
    }

    public async Task<RecurringTransactionResponse> CreateRecurringTransactionAsync(
        CreateRecurringTransactionCommand command,
        CancellationToken cancellationToken = default)
    {
        var validation = await _createValidator.ValidateAsync(command, cancellationToken);
        if (!validation.IsValid)
        {
            throw new AppValidationException(validation.Errors);
        }

        var userId = _currentUser.GetRequiredUserId();
        var sourceAccount = await _dbContext.Accounts
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == command.AccountId && a.UserId == userId, cancellationToken)
            ?? throw new NotFoundException(nameof(FinancialAccount), command.AccountId);

        if (command.DestinationAccountId.HasValue)
        {
            var destAccount = await _dbContext.Accounts
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == command.DestinationAccountId.Value && a.UserId == userId, cancellationToken)
                ?? throw new NotFoundException(nameof(FinancialAccount), command.DestinationAccountId.Value);

            sourceAccount.EnsureSameCurrency(destAccount.CurrencyCode);
        }

        var recurring = new RecurringTransaction(
            userId,
            sourceAccount.Id,
            command.DestinationAccountId,
            command.CategoryId,
            command.Type,
            command.Amount,
            sourceAccount.CurrencyCode,
            command.Description,
            command.Frequency,
            command.NextOccurrenceDate);

        _dbContext.RecurringTransactions.Add(recurring);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var all = await GetRecurringTransactionsAsync(null, cancellationToken);
        return all.First(r => r.Id == recurring.Id);
    }

    /// <summary>
    /// Atomically generates the next transaction occurrence, updates account balance(s), and advances the schedule.
    /// </summary>
    public async Task<RecurringTransactionResponse> ProcessOccurrenceAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();

        await _dbContext.ExecuteInTransactionAsync(async ct =>
        {
            var recurring = await _dbContext.RecurringTransactions
                .FirstOrDefaultAsync(r => r.Id == id && r.UserId == userId, ct)
                ?? throw new NotFoundException(nameof(RecurringTransaction), id);

            var sourceAccount = await _dbContext.Accounts
                .FirstOrDefaultAsync(a => a.Id == recurring.AccountId && a.UserId == userId, ct)
                ?? throw new NotFoundException(nameof(FinancialAccount), recurring.AccountId);

            FinancialAccount? destinationAccount = null;
            if (recurring.DestinationAccountId.HasValue)
            {
                destinationAccount = await _dbContext.Accounts
                    .FirstOrDefaultAsync(a => a.Id == recurring.DestinationAccountId.Value && a.UserId == userId, ct)
                    ?? throw new NotFoundException(nameof(FinancialAccount), recurring.DestinationAccountId.Value);
            }

            var occurrenceDate = recurring.NextOccurrenceDate;
            var transaction = FinancialTransaction.CreateAndApply(
                userId,
                sourceAccount,
                destinationAccount,
                recurring.CategoryId,
                recurring.Type,
                recurring.Amount,
                occurrenceDate,
                $"{recurring.Description} (Recurring)");

            _dbContext.Transactions.Add(transaction);
            recurring.AdvanceOccurrence(occurrenceDate);

            await _dbContext.SaveChangesAsync(ct);
        }, cancellationToken);

        var all = await GetRecurringTransactionsAsync(null, cancellationToken);
        return all.First(r => r.Id == id);
    }

    public async Task DeleteRecurringTransactionAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();
        var recurring = await _dbContext.RecurringTransactions
            .FirstOrDefaultAsync(r => r.Id == id && r.UserId == userId, cancellationToken)
            ?? throw new NotFoundException(nameof(RecurringTransaction), id);

        _dbContext.RecurringTransactions.Remove(recurring);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private static RecurringTransactionResponse MapToResponse(
        RecurringTransaction r,
        IReadOnlyDictionary<Guid, FinancialAccount> accounts,
        IReadOnlyDictionary<Guid, Category> categories)
    {
        accounts.TryGetValue(r.AccountId, out var source);
        FinancialAccount? dest = null;
        if (r.DestinationAccountId.HasValue)
        {
            accounts.TryGetValue(r.DestinationAccountId.Value, out dest);
        }

        Category? category = null;
        if (r.CategoryId.HasValue)
        {
            categories.TryGetValue(r.CategoryId.Value, out category);
        }

        return new RecurringTransactionResponse(
            r.Id,
            r.AccountId,
            source?.Name ?? "Account",
            r.DestinationAccountId,
            dest?.Name,
            r.CategoryId,
            category?.Name,
            r.Type,
            r.Type.ToString(),
            r.Amount,
            r.CurrencyCode,
            r.Description,
            r.Frequency,
            r.Frequency.ToString(),
            r.NextOccurrenceDate,
            r.LastProcessedDate,
            r.IsActive);
    }
}
