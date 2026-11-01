using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Vaultz.Application.Common.Exceptions;
using Vaultz.Application.Common.Interfaces;
using Vaultz.Domain.Common;
using Vaultz.Domain.Entities;
using Vaultz.Domain.Enums;

namespace Vaultz.Application.Features.Transactions;

public sealed record TransactionResponse(
    Guid Id,
    Guid AccountId,
    string AccountName,
    Guid? DestinationAccountId,
    string? DestinationAccountName,
    Guid? CategoryId,
    string? CategoryName,
    string? CategoryColorHex,
    TransactionType Type,
    string TypeName,
    decimal Amount,
    string CurrencyCode,
    decimal? DestinationAmount,
    string? DestinationCurrencyCode,
    decimal? ExchangeRate,
    DateOnly OccurredOn,
    string Description,
    string? Notes,
    DateTimeOffset CreatedAtUtc);

public sealed record PagedTransactionsResponse(
    IReadOnlyList<TransactionResponse> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages,
    bool HasPreviousPage,
    bool HasNextPage);

public sealed record GetTransactionsFilter(
    Guid? AccountId = null,
    Guid? CategoryId = null,
    TransactionType? Type = null,
    DateOnly? FromDate = null,
    DateOnly? ToDate = null,
    string? Search = null,
    int Limit = 100);

public sealed record GetPagedTransactionsFilter(
    Guid? AccountId = null,
    Guid? CategoryId = null,
    TransactionType? Type = null,
    DateOnly? FromDate = null,
    DateOnly? ToDate = null,
    string? Search = null,
    int Page = 1,
    int PageSize = 15);

public sealed record CreateTransactionCommand(
    Guid AccountId,
    Guid? DestinationAccountId,
    Guid? CategoryId,
    TransactionType Type,
    decimal Amount,
    DateOnly OccurredOn,
    string Description,
    string? Notes = null,
    decimal? DestinationAmount = null);

public sealed class CreateTransactionValidator : AbstractValidator<CreateTransactionCommand>
{
    public CreateTransactionValidator()
    {
        RuleFor(x => x.AccountId).NotEmpty();
        RuleFor(x => x.Type).IsInEnum();
        RuleFor(x => x.Amount).GreaterThan(0m);
        RuleFor(x => x.Description).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Notes).MaximumLength(500);

        When(x => x.Type == TransactionType.Transfer, () =>
        {
            RuleFor(x => x.DestinationAccountId)
                .NotEmpty()
                .WithMessage("A destination account is required for transfers.")
                .NotEqual(x => x.AccountId)
                .WithMessage("Source and destination accounts must be different.");

            RuleFor(x => x.CategoryId)
                .Null()
                .WithMessage("Transfers cannot be assigned an income or expense category.");
        });
    }
}

public sealed record UpdateTransactionCommand(
    Guid Id,
    Guid AccountId,
    Guid? DestinationAccountId,
    Guid? CategoryId,
    TransactionType Type,
    decimal Amount,
    DateOnly OccurredOn,
    string Description,
    string? Notes = null,
    decimal? DestinationAmount = null);

public sealed class UpdateTransactionValidator : AbstractValidator<UpdateTransactionCommand>
{
    public UpdateTransactionValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.AccountId).NotEmpty();
        RuleFor(x => x.Type).IsInEnum();
        RuleFor(x => x.Amount).GreaterThan(0m);
        RuleFor(x => x.Description).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Notes).MaximumLength(500);

        When(x => x.Type == TransactionType.Transfer, () =>
        {
            RuleFor(x => x.DestinationAccountId)
                .NotEmpty()
                .NotEqual(x => x.AccountId);
            RuleFor(x => x.CategoryId).Null();
        });
    }
}

public sealed class TransactionHandlers
{
    private readonly IVaultzDbContext _dbContext;
    private readonly ICurrentUserService _currentUser;
    private readonly IValidator<CreateTransactionCommand> _createValidator;
    private readonly IValidator<UpdateTransactionCommand> _updateValidator;

    public TransactionHandlers(
        IVaultzDbContext dbContext,
        ICurrentUserService currentUser,
        IValidator<CreateTransactionCommand> createValidator,
        IValidator<UpdateTransactionCommand> updateValidator)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
    }

    public async Task<IReadOnlyList<TransactionResponse>> GetTransactionsAsync(
        GetTransactionsFilter filter,
        CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();

        var query = _dbContext.Transactions
            .AsNoTracking()
            .Where(t => t.UserId == userId);

        if (filter.AccountId.HasValue)
        {
            var accountId = filter.AccountId.Value;
            query = query.Where(t => t.AccountId == accountId || t.DestinationAccountId == accountId);
        }

        if (filter.CategoryId.HasValue)
        {
            query = query.Where(t => t.CategoryId == filter.CategoryId.Value);
        }

        if (filter.Type.HasValue)
        {
            query = query.Where(t => t.Type == filter.Type.Value);
        }

        if (filter.FromDate.HasValue)
        {
            query = query.Where(t => t.OccurredOn >= filter.FromDate.Value);
        }

        if (filter.ToDate.HasValue)
        {
            query = query.Where(t => t.OccurredOn <= filter.ToDate.Value);
        }

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var search = filter.Search.Trim().ToLower();
            var matchingCategoryIds = await _dbContext.Categories
                .AsNoTracking()
                .Where(c => c.UserId == userId && c.Name.ToLower().Contains(search))
                .Select(c => (Guid?)c.Id)
                .ToListAsync(cancellationToken);

            query = query.Where(t =>
                t.Description.ToLower().Contains(search) ||
                (t.Notes != null && t.Notes.ToLower().Contains(search)) ||
                (t.CategoryId != null && matchingCategoryIds.Contains(t.CategoryId)));
        }

        var limit = Math.Clamp(filter.Limit, 1, 500);
        var transactions = await query
            .OrderByDescending(t => t.OccurredOn)
            .ThenByDescending(t => t.CreatedAtUtc)
            .Take(limit)
            .ToListAsync(cancellationToken);

        var accounts = await _dbContext.Accounts
            .AsNoTracking()
            .Where(a => a.UserId == userId)
            .ToDictionaryAsync(a => a.Id, cancellationToken);

        var categories = await _dbContext.Categories
            .AsNoTracking()
            .Where(c => c.UserId == userId)
            .ToDictionaryAsync(c => c.Id, cancellationToken);

        return transactions
            .Select(t => MapToResponse(t, accounts, categories))
            .ToList();
    }

    public async Task<PagedTransactionsResponse> GetPagedTransactionsAsync(
        GetPagedTransactionsFilter filter,
        CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();

        var query = _dbContext.Transactions
            .AsNoTracking()
            .Where(t => t.UserId == userId);

        if (filter.AccountId.HasValue)
        {
            var accountId = filter.AccountId.Value;
            query = query.Where(t => t.AccountId == accountId || t.DestinationAccountId == accountId);
        }

        if (filter.CategoryId.HasValue)
        {
            query = query.Where(t => t.CategoryId == filter.CategoryId.Value);
        }

        if (filter.Type.HasValue)
        {
            query = query.Where(t => t.Type == filter.Type.Value);
        }

        if (filter.FromDate.HasValue)
        {
            query = query.Where(t => t.OccurredOn >= filter.FromDate.Value);
        }

        if (filter.ToDate.HasValue)
        {
            query = query.Where(t => t.OccurredOn <= filter.ToDate.Value);
        }

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var search = filter.Search.Trim().ToLower();
            var matchingCategoryIds = await _dbContext.Categories
                .AsNoTracking()
                .Where(c => c.UserId == userId && c.Name.ToLower().Contains(search))
                .Select(c => (Guid?)c.Id)
                .ToListAsync(cancellationToken);

            query = query.Where(t =>
                t.Description.ToLower().Contains(search) ||
                (t.Notes != null && t.Notes.ToLower().Contains(search)) ||
                (t.CategoryId != null && matchingCategoryIds.Contains(t.CategoryId)));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var page = Math.Max(1, filter.Page);
        var pageSize = Math.Clamp(filter.PageSize, 1, 100);
        var totalPages = totalCount == 0 ? 1 : (int)Math.Ceiling((double)totalCount / pageSize);

        var transactions = await query
            .OrderByDescending(t => t.OccurredOn)
            .ThenByDescending(t => t.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var accounts = await _dbContext.Accounts
            .AsNoTracking()
            .Where(a => a.UserId == userId)
            .ToDictionaryAsync(a => a.Id, cancellationToken);

        var categories = await _dbContext.Categories
            .AsNoTracking()
            .Where(c => c.UserId == userId)
            .ToDictionaryAsync(c => c.Id, cancellationToken);

        var items = transactions
            .Select(t => MapToResponse(t, accounts, categories))
            .ToList();

        return new PagedTransactionsResponse(
            Items: items,
            Page: page,
            PageSize: pageSize,
            TotalCount: totalCount,
            TotalPages: totalPages,
            HasPreviousPage: page > 1,
            HasNextPage: page < totalPages);
    }

    public async Task<TransactionResponse> CreateTransactionAsync(
        CreateTransactionCommand command,
        CancellationToken cancellationToken = default)
    {
        var validation = await _createValidator.ValidateAsync(command, cancellationToken);
        if (!validation.IsValid)
        {
            throw new AppValidationException(validation.Errors);
        }

        var userId = _currentUser.GetRequiredUserId();
        FinancialTransaction? created = null;
        Dictionary<Guid, FinancialAccount> accountMap = new();
        Dictionary<Guid, Category> categoryMap = new();

        await _dbContext.ExecuteInTransactionAsync(async ct =>
        {
            var sourceAccount = await _dbContext.Accounts
                .FirstOrDefaultAsync(a => a.Id == command.AccountId && a.UserId == userId, ct)
                ?? throw new NotFoundException(nameof(FinancialAccount), command.AccountId);

            accountMap[sourceAccount.Id] = sourceAccount;

            FinancialAccount? destinationAccount = null;
            if (command.DestinationAccountId.HasValue)
            {
                destinationAccount = await _dbContext.Accounts
                    .FirstOrDefaultAsync(a => a.Id == command.DestinationAccountId.Value && a.UserId == userId, ct)
                    ?? throw new NotFoundException(nameof(FinancialAccount), command.DestinationAccountId.Value);

                accountMap[destinationAccount.Id] = destinationAccount;
            }

            if (command.CategoryId.HasValue)
            {
                var category = await _dbContext.Categories
                    .FirstOrDefaultAsync(c => c.Id == command.CategoryId.Value && c.UserId == userId, ct)
                    ?? throw new NotFoundException(nameof(Category), command.CategoryId.Value);

                EnsureCategoryMatchesTransactionType(category, command.Type);
                categoryMap[category.Id] = category;
            }

            created = FinancialTransaction.CreateAndApply(
                userId,
                sourceAccount,
                destinationAccount,
                command.CategoryId,
                command.Type,
                command.Amount,
                command.OccurredOn,
                command.Description,
                command.Notes,
                command.DestinationAmount);

            _dbContext.Transactions.Add(created);
            await _dbContext.SaveChangesAsync(ct);
        }, cancellationToken);

        return MapToResponse(created!, accountMap, categoryMap);
    }

    public async Task<TransactionResponse> UpdateTransactionAsync(
        UpdateTransactionCommand command,
        CancellationToken cancellationToken = default)
    {
        var validation = await _updateValidator.ValidateAsync(command, cancellationToken);
        if (!validation.IsValid)
        {
            throw new AppValidationException(validation.Errors);
        }

        var userId = _currentUser.GetRequiredUserId();
        FinancialTransaction? updated = null;
        Dictionary<Guid, FinancialAccount> accountMap = new();
        Dictionary<Guid, Category> categoryMap = new();

        await _dbContext.ExecuteInTransactionAsync(async ct =>
        {
            var transaction = await _dbContext.Transactions
                .FirstOrDefaultAsync(t => t.Id == command.Id && t.UserId == userId, ct)
                ?? throw new NotFoundException(nameof(FinancialTransaction), command.Id);

            var requiredAccountIds = new HashSet<Guid> { transaction.AccountId, command.AccountId };
            if (transaction.DestinationAccountId.HasValue)
            {
                requiredAccountIds.Add(transaction.DestinationAccountId.Value);
            }
            if (command.DestinationAccountId.HasValue)
            {
                requiredAccountIds.Add(command.DestinationAccountId.Value);
            }

            accountMap = await _dbContext.Accounts
                .Where(a => a.UserId == userId && requiredAccountIds.Contains(a.Id))
                .ToDictionaryAsync(a => a.Id, ct);

            if (!accountMap.TryGetValue(transaction.AccountId, out var prevSource))
            {
                throw new NotFoundException(nameof(FinancialAccount), transaction.AccountId);
            }

            FinancialAccount? prevDest = null;
            if (transaction.DestinationAccountId.HasValue &&
                !accountMap.TryGetValue(transaction.DestinationAccountId.Value, out prevDest))
            {
                throw new NotFoundException(nameof(FinancialAccount), transaction.DestinationAccountId.Value);
            }

            if (!accountMap.TryGetValue(command.AccountId, out var newSource))
            {
                throw new NotFoundException(nameof(FinancialAccount), command.AccountId);
            }

            FinancialAccount? newDest = null;
            if (command.DestinationAccountId.HasValue &&
                !accountMap.TryGetValue(command.DestinationAccountId.Value, out newDest))
            {
                throw new NotFoundException(nameof(FinancialAccount), command.DestinationAccountId.Value);
            }

            if (command.CategoryId.HasValue)
            {
                var category = await _dbContext.Categories
                    .FirstOrDefaultAsync(c => c.Id == command.CategoryId.Value && c.UserId == userId, ct)
                    ?? throw new NotFoundException(nameof(Category), command.CategoryId.Value);

                EnsureCategoryMatchesTransactionType(category, command.Type);
                categoryMap[category.Id] = category;
            }

            transaction.UpdateAndReconcile(
                prevSource,
                prevDest,
                newSource,
                newDest,
                command.CategoryId,
                command.Type,
                command.Amount,
                command.OccurredOn,
                command.Description,
                command.Notes,
                command.DestinationAmount);

            await _dbContext.SaveChangesAsync(ct);
            updated = transaction;
        }, cancellationToken);

        return MapToResponse(updated!, accountMap, categoryMap);
    }

    public async Task DeleteTransactionAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();

        await _dbContext.ExecuteInTransactionAsync(async ct =>
        {
            var transaction = await _dbContext.Transactions
                .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId, ct)
                ?? throw new NotFoundException(nameof(FinancialTransaction), id);

            var sourceAccount = await _dbContext.Accounts
                .FirstOrDefaultAsync(a => a.Id == transaction.AccountId && a.UserId == userId, ct)
                ?? throw new NotFoundException(nameof(FinancialAccount), transaction.AccountId);

            FinancialAccount? destinationAccount = null;
            if (transaction.DestinationAccountId.HasValue)
            {
                destinationAccount = await _dbContext.Accounts
                    .FirstOrDefaultAsync(a => a.Id == transaction.DestinationAccountId.Value && a.UserId == userId, ct)
                    ?? throw new NotFoundException(nameof(FinancialAccount), transaction.DestinationAccountId.Value);
            }

            transaction.ReverseBalanceImpact(sourceAccount, destinationAccount);
            _dbContext.Transactions.Remove(transaction);

            await _dbContext.SaveChangesAsync(ct);
        }, cancellationToken);
    }

    private static void EnsureCategoryMatchesTransactionType(Category category, TransactionType transactionType)
    {
        if (transactionType == TransactionType.Income && category.Type != CategoryType.Income)
        {
            throw new DomainException("Income transactions must use an Income category.", "category_type_mismatch");
        }

        if (transactionType == TransactionType.Expense && category.Type != CategoryType.Expense)
        {
            throw new DomainException("Expense transactions must use an Expense category.", "category_type_mismatch");
        }
    }

    private static TransactionResponse MapToResponse(
        FinancialTransaction t,
        IReadOnlyDictionary<Guid, FinancialAccount> accounts,
        IReadOnlyDictionary<Guid, Category> categories)
    {
        accounts.TryGetValue(t.AccountId, out var sourceAccount);
        FinancialAccount? destAccount = null;
        if (t.DestinationAccountId.HasValue)
        {
            accounts.TryGetValue(t.DestinationAccountId.Value, out destAccount);
        }

        Category? category = null;
        if (t.CategoryId.HasValue)
        {
            categories.TryGetValue(t.CategoryId.Value, out category);
        }

        return new TransactionResponse(
            t.Id,
            t.AccountId,
            sourceAccount?.Name ?? "Account",
            t.DestinationAccountId,
            destAccount?.Name,
            t.CategoryId,
            category?.Name,
            category?.ColorHex,
            t.Type,
            t.Type.ToString(),
            t.Amount,
            t.CurrencyCode,
            t.DestinationAmount,
            t.DestinationCurrencyCode,
            t.ExchangeRate,
            t.OccurredOn,
            t.Description,
            t.Notes,
            t.CreatedAtUtc);
    }
}
