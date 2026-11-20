using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Vaultz.Application.Common.Exceptions;
using Vaultz.Application.Common.Interfaces;
using Vaultz.Domain.Common;
using Vaultz.Domain.Entities;
using Vaultz.Domain.Enums;

namespace Vaultz.Application.Features.QuickLogPresets;

public sealed record QuickLogPresetResponse(
    Guid Id,
    Guid AccountId,
    string Label,
    decimal Amount,
    string CurrencyCode,
    TransactionType Type,
    string TypeName,
    Guid? CategoryId,
    string? CategoryName,
    Guid? BudgetSliceId,
    string? BudgetSliceName,
    string Icon,
    string ColorHex,
    int SortOrder);

public sealed record QuickLogPresetItemInput(
    string Label,
    decimal Amount,
    TransactionType Type = TransactionType.Expense,
    Guid? CategoryId = null,
    Guid? BudgetSliceId = null,
    string Icon = "zap",
    string ColorHex = "#2A6B58",
    int SortOrder = 0);

public sealed record CreateQuickLogPresetCommand(
    Guid AccountId,
    string Label,
    decimal Amount,
    TransactionType Type = TransactionType.Expense,
    Guid? CategoryId = null,
    Guid? BudgetSliceId = null,
    string Icon = "zap",
    string ColorHex = "#2A6B58",
    int SortOrder = 0);

public sealed class CreateQuickLogPresetValidator : AbstractValidator<CreateQuickLogPresetCommand>
{
    public CreateQuickLogPresetValidator()
    {
        RuleFor(x => x.AccountId).NotEmpty();
        RuleFor(x => x.Label).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Amount).GreaterThan(0m);
        RuleFor(x => x.Type)
            .Must(t => t is TransactionType.Expense or TransactionType.Income)
            .WithMessage("Quick log presets support Expense or Income transactions only.");
        RuleFor(x => x.Icon).MaximumLength(32);
        RuleFor(x => x.ColorHex)
            .Matches("^#[0-9A-Fa-f]{6}$")
            .When(x => !string.IsNullOrWhiteSpace(x.ColorHex))
            .WithMessage("Color must be a 7-character hex string (e.g., #2A6B58).");
    }
}

public sealed record UpdateQuickLogPresetCommand(
    Guid Id,
    string Label,
    decimal Amount,
    TransactionType Type = TransactionType.Expense,
    Guid? CategoryId = null,
    Guid? BudgetSliceId = null,
    string Icon = "zap",
    string ColorHex = "#2A6B58",
    int SortOrder = 0);

public sealed class UpdateQuickLogPresetValidator : AbstractValidator<UpdateQuickLogPresetCommand>
{
    public UpdateQuickLogPresetValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Label).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Amount).GreaterThan(0m);
        RuleFor(x => x.Type)
            .Must(t => t is TransactionType.Expense or TransactionType.Income)
            .WithMessage("Quick log presets support Expense or Income transactions only.");
        RuleFor(x => x.Icon).MaximumLength(32);
        RuleFor(x => x.ColorHex)
            .Matches("^#[0-9A-Fa-f]{6}$")
            .When(x => !string.IsNullOrWhiteSpace(x.ColorHex))
            .WithMessage("Color must be a 7-character hex string (e.g., #2A6B58).");
    }
}

public sealed record ReplaceAccountQuickLogPresetsCommand(
    Guid AccountId,
    IReadOnlyList<QuickLogPresetItemInput> Presets);

public sealed class QuickLogPresetItemInputValidator : AbstractValidator<QuickLogPresetItemInput>
{
    public QuickLogPresetItemInputValidator()
    {
        RuleFor(x => x.Label).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Amount).GreaterThan(0m);
        RuleFor(x => x.Type)
            .Must(t => t is TransactionType.Expense or TransactionType.Income)
            .WithMessage("Quick log presets support Expense or Income transactions only.");
        RuleFor(x => x.Icon).MaximumLength(32);
        RuleFor(x => x.ColorHex)
            .Matches("^#[0-9A-Fa-f]{6}$")
            .When(x => !string.IsNullOrWhiteSpace(x.ColorHex))
            .WithMessage("Color must be a 7-character hex string (e.g., #2A6B58).");
    }
}

public sealed class ReplaceAccountQuickLogPresetsValidator : AbstractValidator<ReplaceAccountQuickLogPresetsCommand>
{
    public ReplaceAccountQuickLogPresetsValidator()
    {
        RuleFor(x => x.AccountId).NotEmpty();
        RuleFor(x => x.Presets).NotNull();
        RuleFor(x => x.Presets.Count)
            .LessThanOrEqualTo(QuickLogPresetHandlers.MaxPresetsPerAccount)
            .WithMessage($"You can configure at most {QuickLogPresetHandlers.MaxPresetsPerAccount} quick-log presets per account.")
            .When(x => x.Presets is not null);
        RuleForEach(x => x.Presets).SetValidator(new QuickLogPresetItemInputValidator());
    }
}

public sealed class QuickLogPresetHandlers
{
    public const int MaxPresetsPerAccount = 6;

    private readonly IVaultzDbContext _dbContext;
    private readonly ICurrentUserService _currentUser;
    private readonly IValidator<CreateQuickLogPresetCommand> _createValidator;
    private readonly IValidator<UpdateQuickLogPresetCommand> _updateValidator;
    private readonly IValidator<ReplaceAccountQuickLogPresetsCommand> _replaceValidator;

    public QuickLogPresetHandlers(
        IVaultzDbContext dbContext,
        ICurrentUserService currentUser,
        IValidator<CreateQuickLogPresetCommand> createValidator,
        IValidator<UpdateQuickLogPresetCommand> updateValidator,
        IValidator<ReplaceAccountQuickLogPresetsCommand> replaceValidator)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _replaceValidator = replaceValidator;
    }

    public async Task<IReadOnlyList<QuickLogPresetResponse>> GetPresetsAsync(
        Guid accountId,
        CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();

        var accountExists = await _dbContext.Accounts
            .AsNoTracking()
            .AnyAsync(a => a.Id == accountId && a.UserId == userId, cancellationToken);

        if (!accountExists)
        {
            throw new NotFoundException(nameof(FinancialAccount), accountId);
        }

        var presets = await _dbContext.QuickLogPresets
            .AsNoTracking()
            .Where(p => p.UserId == userId && p.AccountId == accountId)
            .OrderBy(p => p.SortOrder)
            .ThenBy(p => p.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        return await HydrateResponsesAsync(userId, presets, cancellationToken);
    }

    public async Task<QuickLogPresetResponse> CreatePresetAsync(
        CreateQuickLogPresetCommand command,
        CancellationToken cancellationToken = default)
    {
        var validation = await _createValidator.ValidateAsync(command, cancellationToken);
        if (!validation.IsValid)
        {
            throw new AppValidationException(validation.Errors);
        }

        var userId = _currentUser.GetRequiredUserId();

        var account = await _dbContext.Accounts
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == command.AccountId && a.UserId == userId, cancellationToken)
            ?? throw new NotFoundException(nameof(FinancialAccount), command.AccountId);

        var existingCount = await _dbContext.QuickLogPresets
            .CountAsync(p => p.UserId == userId && p.AccountId == command.AccountId, cancellationToken);

        if (existingCount >= MaxPresetsPerAccount)
        {
            throw new DomainException(
                $"You can configure at most {MaxPresetsPerAccount} quick-log presets per account.",
                "max_quick_log_presets_exceeded");
        }

        var categoryName = await ValidateAndResolveCategoryNameAsync(userId, command.CategoryId, command.Type, cancellationToken);
        var effectiveSliceId = command.Type == TransactionType.Expense ? command.BudgetSliceId : null;
        var sliceName = await ValidateAndResolveSliceNameAsync(userId, command.AccountId, effectiveSliceId, cancellationToken);

        var preset = new QuickLogPreset(
            userId,
            command.AccountId,
            command.Label,
            command.Amount,
            account.CurrencyCode,
            command.Type,
            command.CategoryId,
            effectiveSliceId,
            command.Icon,
            command.ColorHex,
            command.SortOrder);

        _dbContext.QuickLogPresets.Add(preset);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return MapToResponse(preset, categoryName, sliceName);
    }

    public async Task<QuickLogPresetResponse> UpdatePresetAsync(
        UpdateQuickLogPresetCommand command,
        CancellationToken cancellationToken = default)
    {
        var validation = await _updateValidator.ValidateAsync(command, cancellationToken);
        if (!validation.IsValid)
        {
            throw new AppValidationException(validation.Errors);
        }

        var userId = _currentUser.GetRequiredUserId();

        var preset = await _dbContext.QuickLogPresets
            .FirstOrDefaultAsync(p => p.Id == command.Id && p.UserId == userId, cancellationToken)
            ?? throw new NotFoundException(nameof(QuickLogPreset), command.Id);

        var categoryName = await ValidateAndResolveCategoryNameAsync(userId, command.CategoryId, command.Type, cancellationToken);
        var effectiveSliceId = command.Type == TransactionType.Expense ? command.BudgetSliceId : null;
        var sliceName = await ValidateAndResolveSliceNameAsync(userId, preset.AccountId, effectiveSliceId, cancellationToken);

        preset.Update(
            command.Label,
            command.Amount,
            command.Type,
            command.CategoryId,
            effectiveSliceId,
            command.Icon,
            command.ColorHex,
            command.SortOrder);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return MapToResponse(preset, categoryName, sliceName);
    }

    public async Task<IReadOnlyList<QuickLogPresetResponse>> ReplaceAccountPresetsAsync(
        ReplaceAccountQuickLogPresetsCommand command,
        CancellationToken cancellationToken = default)
    {
        var validation = await _replaceValidator.ValidateAsync(command, cancellationToken);
        if (!validation.IsValid)
        {
            throw new AppValidationException(validation.Errors);
        }

        var userId = _currentUser.GetRequiredUserId();
        List<QuickLogPreset> created = [];

        await _dbContext.ExecuteInTransactionAsync(async ct =>
        {
            var account = await _dbContext.Accounts
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == command.AccountId && a.UserId == userId, ct)
                ?? throw new NotFoundException(nameof(FinancialAccount), command.AccountId);

            if (command.Presets.Count > MaxPresetsPerAccount)
            {
                throw new DomainException(
                    $"You can configure at most {MaxPresetsPerAccount} quick-log presets per account.",
                    "max_quick_log_presets_exceeded");
            }

            var categoryIds = command.Presets
                .Where(p => p.CategoryId.HasValue)
                .Select(p => p.CategoryId!.Value)
                .Distinct()
                .ToList();

            var categoriesById = categoryIds.Count > 0
                ? await _dbContext.Categories
                    .AsNoTracking()
                    .Where(c => c.UserId == userId && categoryIds.Contains(c.Id))
                    .ToDictionaryAsync(c => c.Id, ct)
                : new Dictionary<Guid, Category>();

            var sliceIds = command.Presets
                .Where(p => p.Type == TransactionType.Expense && p.BudgetSliceId.HasValue)
                .Select(p => p.BudgetSliceId!.Value)
                .Distinct()
                .ToList();

            var validSliceIds = sliceIds.Count > 0
                ? (await _dbContext.MonthlyBudgetSlices
                    .AsNoTracking()
                    .Join(
                        _dbContext.MonthlyBudgetPlans.AsNoTracking().Where(plan => plan.UserId == userId && plan.AccountId == command.AccountId),
                        slice => slice.MonthlyBudgetPlanId,
                        plan => plan.Id,
                        (slice, _) => slice)
                    .Where(s => s.UserId == userId && sliceIds.Contains(s.Id))
                    .Select(s => s.Id)
                    .ToListAsync(ct)).ToHashSet()
                : [];

            var existing = await _dbContext.QuickLogPresets
                .Where(p => p.UserId == userId && p.AccountId == command.AccountId)
                .ToListAsync(ct);

            if (existing.Count > 0)
            {
                _dbContext.QuickLogPresets.RemoveRange(existing);
            }

            for (var index = 0; index < command.Presets.Count; index++)
            {
                var item = command.Presets[index];
                if (item.CategoryId.HasValue)
                {
                    if (!categoriesById.TryGetValue(item.CategoryId.Value, out var cat))
                    {
                        throw new NotFoundException(nameof(Category), item.CategoryId.Value);
                    }

                    EnsureCategoryMatchesTransactionType(cat, item.Type);
                }

                Guid? effectiveSliceId = null;
                if (item.Type == TransactionType.Expense && item.BudgetSliceId.HasValue)
                {
                    if (!validSliceIds.Contains(item.BudgetSliceId.Value))
                    {
                        throw new NotFoundException(nameof(MonthlyBudgetSlice), item.BudgetSliceId.Value);
                    }

                    effectiveSliceId = item.BudgetSliceId.Value;
                }

                var preset = new QuickLogPreset(
                    userId,
                    command.AccountId,
                    item.Label,
                    item.Amount,
                    account.CurrencyCode,
                    item.Type,
                    item.CategoryId,
                    effectiveSliceId,
                    item.Icon,
                    item.ColorHex,
                    sortOrder: index);

                created.Add(preset);
            }

            if (created.Count > 0)
            {
                _dbContext.QuickLogPresets.AddRange(created);
            }

            await _dbContext.SaveChangesAsync(ct);
        }, cancellationToken);

        return await HydrateResponsesAsync(userId, created, cancellationToken);
    }

    public async Task DeletePresetAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();
        var preset = await _dbContext.QuickLogPresets
            .FirstOrDefaultAsync(p => p.Id == id && p.UserId == userId, cancellationToken)
            ?? throw new NotFoundException(nameof(QuickLogPreset), id);

        _dbContext.QuickLogPresets.Remove(preset);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task<IReadOnlyList<QuickLogPresetResponse>> HydrateResponsesAsync(
        string userId,
        IReadOnlyList<QuickLogPreset> presets,
        CancellationToken cancellationToken)
    {
        if (presets.Count == 0)
        {
            return [];
        }

        var categoryIds = presets
            .Where(p => p.CategoryId.HasValue)
            .Select(p => p.CategoryId!.Value)
            .Distinct()
            .ToList();

        var categoryNames = categoryIds.Count > 0
            ? await _dbContext.Categories
                .AsNoTracking()
                .Where(c => c.UserId == userId && categoryIds.Contains(c.Id))
                .ToDictionaryAsync(c => c.Id, c => c.Name, cancellationToken)
            : new Dictionary<Guid, string>();

        var sliceIds = presets
            .Where(p => p.BudgetSliceId.HasValue)
            .Select(p => p.BudgetSliceId!.Value)
            .Distinct()
            .ToList();

        var sliceNames = sliceIds.Count > 0
            ? await _dbContext.MonthlyBudgetSlices
                .AsNoTracking()
                .Where(s => s.UserId == userId && sliceIds.Contains(s.Id))
                .ToDictionaryAsync(s => s.Id, s => s.Name, cancellationToken)
            : new Dictionary<Guid, string>();

        return presets
            .OrderBy(p => p.SortOrder)
            .ThenBy(p => p.CreatedAtUtc)
            .Select(p => MapToResponse(
                p,
                p.CategoryId.HasValue && categoryNames.TryGetValue(p.CategoryId.Value, out var cname) ? cname : null,
                p.BudgetSliceId.HasValue && sliceNames.TryGetValue(p.BudgetSliceId.Value, out var sname) ? sname : null))
            .ToList();
    }

    private async Task<string?> ValidateAndResolveCategoryNameAsync(
        string userId,
        Guid? categoryId,
        TransactionType type,
        CancellationToken cancellationToken)
    {
        if (!categoryId.HasValue)
        {
            return null;
        }

        var category = await _dbContext.Categories
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == categoryId.Value && c.UserId == userId, cancellationToken)
            ?? throw new NotFoundException(nameof(Category), categoryId.Value);

        EnsureCategoryMatchesTransactionType(category, type);
        return category.Name;
    }

    private async Task<string?> ValidateAndResolveSliceNameAsync(
        string userId,
        Guid accountId,
        Guid? budgetSliceId,
        CancellationToken cancellationToken)
    {
        if (!budgetSliceId.HasValue)
        {
            return null;
        }

        var slice = await _dbContext.MonthlyBudgetSlices
            .AsNoTracking()
            .Join(
                _dbContext.MonthlyBudgetPlans.AsNoTracking().Where(p => p.UserId == userId && p.AccountId == accountId),
                s => s.MonthlyBudgetPlanId,
                p => p.Id,
                (s, _) => s)
            .FirstOrDefaultAsync(s => s.Id == budgetSliceId.Value && s.UserId == userId, cancellationToken)
            ?? throw new NotFoundException(nameof(MonthlyBudgetSlice), budgetSliceId.Value);

        return slice.Name;
    }

    private static void EnsureCategoryMatchesTransactionType(Category category, TransactionType type)
    {
        if (type == TransactionType.Income && category.Type != CategoryType.Income)
        {
            throw new DomainException("Income presets must use an Income category.", "category_type_mismatch");
        }

        if (type == TransactionType.Expense && category.Type != CategoryType.Expense)
        {
            throw new DomainException("Expense presets must use an Expense category.", "category_type_mismatch");
        }
    }

    private static QuickLogPresetResponse MapToResponse(
        QuickLogPreset preset,
        string? categoryName,
        string? budgetSliceName) =>
        new(
            preset.Id,
            preset.AccountId,
            preset.Label,
            preset.Amount,
            preset.CurrencyCode,
            preset.Type,
            preset.Type.ToString(),
            preset.CategoryId,
            categoryName,
            preset.BudgetSliceId,
            budgetSliceName,
            preset.Icon,
            preset.ColorHex,
            preset.SortOrder);
}
