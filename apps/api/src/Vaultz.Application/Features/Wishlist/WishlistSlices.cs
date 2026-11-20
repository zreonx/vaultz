using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Vaultz.Application.Common.Exceptions;
using Vaultz.Application.Common.Interfaces;
using Vaultz.Domain.Common;
using Vaultz.Domain.Entities;
using Vaultz.Domain.Enums;

namespace Vaultz.Application.Features.Wishlist;

public sealed record WishlistItemResponse(
    Guid Id,
    string Name,
    decimal EstimatedPrice,
    string CurrencyCode,
    WishlistPriority Priority,
    string PriorityName,
    WishlistStatus Status,
    string StatusName,
    Guid? AccountId,
    string? AccountName,
    Guid? CategoryId,
    string? CategoryName,
    DateOnly? TargetDate,
    string? Url,
    string? Notes,
    DateTimeOffset? PurchasedAtUtc,
    Guid? PurchasedTransactionId,
    DateTimeOffset CreatedAtUtc,
    DateTimeOffset? UpdatedAtUtc);

public sealed record CreateWishlistItemCommand(
    string Name,
    decimal EstimatedPrice,
    string CurrencyCode,
    WishlistPriority Priority = WishlistPriority.Medium,
    Guid? AccountId = null,
    Guid? CategoryId = null,
    DateOnly? TargetDate = null,
    string? Url = null,
    string? Notes = null);

public sealed record UpdateWishlistItemCommand(
    string Name,
    decimal EstimatedPrice,
    string CurrencyCode,
    WishlistPriority Priority,
    WishlistStatus Status,
    Guid? AccountId = null,
    Guid? CategoryId = null,
    DateOnly? TargetDate = null,
    string? Url = null,
    string? Notes = null);

public sealed record PurchaseWishlistItemCommand(
    bool LogExpense = false,
    Guid? AccountId = null,
    Guid? CategoryId = null,
    DateOnly? OccurredOn = null,
    decimal? ActualAmount = null);

public sealed class CreateWishlistItemValidator : AbstractValidator<CreateWishlistItemCommand>
{
    public CreateWishlistItemValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(120);
        RuleFor(x => x.EstimatedPrice).GreaterThan(0m);
        RuleFor(x => x.CurrencyCode).NotEmpty().Length(3).Matches("^[A-Za-z]{3}$");
        RuleFor(x => x.Priority).IsInEnum();
        RuleFor(x => x.Url)
            .MaximumLength(500)
            .Must(u => string.IsNullOrWhiteSpace(u) || (Uri.TryCreate(u.Trim(), UriKind.Absolute, out var uri) && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps)))
            .WithMessage("URL must start with http:// or https://.");
        RuleFor(x => x.Notes).MaximumLength(500);
    }
}

public sealed class UpdateWishlistItemValidator : AbstractValidator<UpdateWishlistItemCommand>
{
    public UpdateWishlistItemValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(120);
        RuleFor(x => x.EstimatedPrice).GreaterThan(0m);
        RuleFor(x => x.CurrencyCode).NotEmpty().Length(3).Matches("^[A-Za-z]{3}$");
        RuleFor(x => x.Priority).IsInEnum();
        RuleFor(x => x.Status).IsInEnum();
        RuleFor(x => x.Url)
            .MaximumLength(500)
            .Must(u => string.IsNullOrWhiteSpace(u) || (Uri.TryCreate(u.Trim(), UriKind.Absolute, out var uri) && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps)))
            .WithMessage("URL must start with http:// or https://.");
        RuleFor(x => x.Notes).MaximumLength(500);
    }
}

public sealed class PurchaseWishlistItemValidator : AbstractValidator<PurchaseWishlistItemCommand>
{
    public PurchaseWishlistItemValidator()
    {
        When(x => x.ActualAmount.HasValue, () =>
        {
            RuleFor(x => x.ActualAmount!.Value).GreaterThan(0m);
        });
    }
}

public sealed class WishlistHandlers
{
    private readonly IVaultzDbContext _dbContext;
    private readonly ICurrentUserService _currentUser;
    private readonly IValidator<CreateWishlistItemCommand> _createValidator;
    private readonly IValidator<UpdateWishlistItemCommand> _updateValidator;
    private readonly IValidator<PurchaseWishlistItemCommand> _purchaseValidator;

    public WishlistHandlers(
        IVaultzDbContext dbContext,
        ICurrentUserService currentUser,
        IValidator<CreateWishlistItemCommand> createValidator,
        IValidator<UpdateWishlistItemCommand> updateValidator,
        IValidator<PurchaseWishlistItemCommand> purchaseValidator)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _purchaseValidator = purchaseValidator;
    }

    public async Task<IReadOnlyList<WishlistItemResponse>> GetWishlistItemsAsync(
        Guid? accountId = null,
        WishlistStatus? status = null,
        CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();

        var query = _dbContext.WishlistItems
            .AsNoTracking()
            .Where(w => w.UserId == userId);

        if (accountId.HasValue)
        {
            query = query.Where(w => w.AccountId == null || w.AccountId == accountId.Value);
        }

        if (status.HasValue)
        {
            query = query.Where(w => w.Status == status.Value);
        }

        var items = await query
            .OrderBy(w => w.Status)
            .ThenByDescending(w => w.Priority)
            .ThenByDescending(w => w.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        var accounts = await _dbContext.Accounts
            .AsNoTracking()
            .Where(a => a.UserId == userId)
            .ToDictionaryAsync(a => a.Id, a => a.Name, cancellationToken);

        var categories = await _dbContext.Categories
            .AsNoTracking()
            .Where(c => c.UserId == userId)
            .ToDictionaryAsync(c => c.Id, c => c.Name, cancellationToken);

        return items.Select(w => MapToResponse(w, accounts, categories)).ToList();
    }

    public async Task<WishlistItemResponse> CreateWishlistItemAsync(
        CreateWishlistItemCommand command,
        CancellationToken cancellationToken = default)
    {
        var validation = await _createValidator.ValidateAsync(command, cancellationToken);
        if (!validation.IsValid)
        {
            throw new AppValidationException(validation.Errors);
        }

        var userId = _currentUser.GetRequiredUserId();
        await ValidateOptionalReferencesAsync(userId, command.AccountId, command.CategoryId, cancellationToken);

        var item = new WishlistItem(
            userId,
            command.Name,
            command.EstimatedPrice,
            command.CurrencyCode,
            command.Priority,
            command.AccountId,
            command.CategoryId,
            command.TargetDate,
            command.Url,
            command.Notes);

        _dbContext.WishlistItems.Add(item);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return await LoadMappedSingleAsync(userId, item.Id, cancellationToken);
    }

    public async Task<WishlistItemResponse> UpdateWishlistItemAsync(
        Guid id,
        UpdateWishlistItemCommand command,
        CancellationToken cancellationToken = default)
    {
        var validation = await _updateValidator.ValidateAsync(command, cancellationToken);
        if (!validation.IsValid)
        {
            throw new AppValidationException(validation.Errors);
        }

        var userId = _currentUser.GetRequiredUserId();
        var item = await _dbContext.WishlistItems
            .FirstOrDefaultAsync(w => w.Id == id && w.UserId == userId, cancellationToken)
            ?? throw new NotFoundException(nameof(WishlistItem), id);

        await ValidateOptionalReferencesAsync(userId, command.AccountId, command.CategoryId, cancellationToken);

        item.Update(
            command.Name,
            command.EstimatedPrice,
            command.CurrencyCode,
            command.Priority,
            command.Status,
            command.AccountId,
            command.CategoryId,
            command.TargetDate,
            command.Url,
            command.Notes);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return await LoadMappedSingleAsync(userId, item.Id, cancellationToken);
    }

    public async Task<WishlistItemResponse> PurchaseWishlistItemAsync(
        Guid id,
        PurchaseWishlistItemCommand command,
        CancellationToken cancellationToken = default)
    {
        var validation = await _purchaseValidator.ValidateAsync(command, cancellationToken);
        if (!validation.IsValid)
        {
            throw new AppValidationException(validation.Errors);
        }

        var userId = _currentUser.GetRequiredUserId();
        var now = DateTimeOffset.UtcNow;

        await _dbContext.ExecuteInTransactionAsync(async ct =>
        {
            var item = await _dbContext.WishlistItems
                .FirstOrDefaultAsync(w => w.Id == id && w.UserId == userId, ct)
                ?? throw new NotFoundException(nameof(WishlistItem), id);

            if (!command.LogExpense)
            {
                item.MarkPurchased(now, null);
                await _dbContext.SaveChangesAsync(ct);
                return;
            }

            var targetAccountId = command.AccountId ?? item.AccountId;
            if (!targetAccountId.HasValue)
            {
                throw new DomainException(
                    "Select an account to record the purchase expense.",
                    "account_required_for_expense");
            }

            var account = await _dbContext.Accounts
                .FirstOrDefaultAsync(a => a.Id == targetAccountId.Value && a.UserId == userId, ct)
                ?? throw new NotFoundException(nameof(FinancialAccount), targetAccountId.Value);

            decimal expenseAmount;
            if (account.CurrencyCode.Equals(item.CurrencyCode, StringComparison.OrdinalIgnoreCase))
            {
                expenseAmount = command.ActualAmount ?? item.EstimatedPrice;
            }
            else if (command.ActualAmount.HasValue)
            {
                expenseAmount = command.ActualAmount.Value;
            }
            else
            {
                throw new DomainException(
                    $"Specify the actual amount in {account.CurrencyCode} when purchasing a {item.CurrencyCode} wishlist item.",
                    "currency_mismatch_actual_amount_required");
            }

            var targetCategoryId = command.CategoryId ?? item.CategoryId;
            if (targetCategoryId.HasValue)
            {
                var catExists = await _dbContext.Categories
                    .AsNoTracking()
                    .AnyAsync(c => c.Id == targetCategoryId.Value && c.UserId == userId, ct);
                if (!catExists)
                {
                    throw new NotFoundException(nameof(Category), targetCategoryId.Value);
                }
            }

            var occurredOn = command.OccurredOn ?? DateOnly.FromDateTime(now.UtcDateTime);
            var transaction = FinancialTransaction.CreateAndApply(
                userId,
                account,
                null,
                targetCategoryId,
                TransactionType.Expense,
                expenseAmount,
                occurredOn,
                $"{item.Name} (Wishlist)",
                item.Notes);

            _dbContext.Transactions.Add(transaction);
            item.MarkPurchased(now, transaction.Id);

            await _dbContext.SaveChangesAsync(ct);
        }, cancellationToken);

        return await LoadMappedSingleAsync(userId, id, cancellationToken);
    }

    public async Task DeleteWishlistItemAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();
        var item = await _dbContext.WishlistItems
            .FirstOrDefaultAsync(w => w.Id == id && w.UserId == userId, cancellationToken)
            ?? throw new NotFoundException(nameof(WishlistItem), id);

        _dbContext.WishlistItems.Remove(item);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task ValidateOptionalReferencesAsync(
        string userId,
        Guid? accountId,
        Guid? categoryId,
        CancellationToken cancellationToken)
    {
        if (accountId.HasValue)
        {
            var accountExists = await _dbContext.Accounts
                .AsNoTracking()
                .AnyAsync(a => a.Id == accountId.Value && a.UserId == userId, cancellationToken);
            if (!accountExists)
            {
                throw new NotFoundException(nameof(FinancialAccount), accountId.Value);
            }
        }

        if (categoryId.HasValue)
        {
            var catExists = await _dbContext.Categories
                .AsNoTracking()
                .AnyAsync(c => c.Id == categoryId.Value && c.UserId == userId, cancellationToken);
            if (!catExists)
            {
                throw new NotFoundException(nameof(Category), categoryId.Value);
            }
        }
    }

    private async Task<WishlistItemResponse> LoadMappedSingleAsync(
        string userId,
        Guid id,
        CancellationToken cancellationToken)
    {
        var item = await _dbContext.WishlistItems
            .AsNoTracking()
            .FirstAsync(w => w.Id == id && w.UserId == userId, cancellationToken);

        string? accountName = null;
        if (item.AccountId.HasValue)
        {
            accountName = await _dbContext.Accounts
                .AsNoTracking()
                .Where(a => a.Id == item.AccountId.Value && a.UserId == userId)
                .Select(a => a.Name)
                .FirstOrDefaultAsync(cancellationToken);
        }

        string? categoryName = null;
        if (item.CategoryId.HasValue)
        {
            categoryName = await _dbContext.Categories
                .AsNoTracking()
                .Where(c => c.Id == item.CategoryId.Value && c.UserId == userId)
                .Select(c => c.Name)
                .FirstOrDefaultAsync(cancellationToken);
        }

        return new WishlistItemResponse(
            item.Id,
            item.Name,
            item.EstimatedPrice,
            item.CurrencyCode,
            item.Priority,
            item.Priority.ToString(),
            item.Status,
            item.Status.ToString(),
            item.AccountId,
            accountName,
            item.CategoryId,
            categoryName,
            item.TargetDate,
            item.Url,
            item.Notes,
            item.PurchasedAtUtc,
            item.PurchasedTransactionId,
            item.CreatedAtUtc,
            item.UpdatedAtUtc);
    }

    private static WishlistItemResponse MapToResponse(
        WishlistItem w,
        IReadOnlyDictionary<Guid, string> accounts,
        IReadOnlyDictionary<Guid, string> categories)
    {
        string? accountName = null;
        if (w.AccountId.HasValue)
        {
            accounts.TryGetValue(w.AccountId.Value, out accountName);
        }

        string? categoryName = null;
        if (w.CategoryId.HasValue)
        {
            categories.TryGetValue(w.CategoryId.Value, out categoryName);
        }

        return new WishlistItemResponse(
            w.Id,
            w.Name,
            w.EstimatedPrice,
            w.CurrencyCode,
            w.Priority,
            w.Priority.ToString(),
            w.Status,
            w.Status.ToString(),
            w.AccountId,
            accountName,
            w.CategoryId,
            categoryName,
            w.TargetDate,
            w.Url,
            w.Notes,
            w.PurchasedAtUtc,
            w.PurchasedTransactionId,
            w.CreatedAtUtc,
            w.UpdatedAtUtc);
    }
}
