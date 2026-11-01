using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Vaultz.Application.Common.Exceptions;
using Vaultz.Application.Common.Interfaces;
using Vaultz.Domain.Entities;
using Vaultz.Domain.Enums;

namespace Vaultz.Application.Features.Categories;

public sealed record CategoryResponse(
    Guid Id,
    string Name,
    CategoryType Type,
    string TypeName,
    string ColorHex,
    bool IsArchived,
    Guid? AccountId = null,
    string? AccountName = null);

public sealed record CreateCategoryCommand(
    string Name,
    CategoryType Type,
    string? ColorHex = "#2A6B58",
    Guid? AccountId = null);

public sealed class CreateCategoryValidator : AbstractValidator<CreateCategoryCommand>
{
    public CreateCategoryValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(80);
        RuleFor(x => x.Type).IsInEnum();
        RuleFor(x => x.ColorHex)
            .Matches("^#[0-9A-Fa-f]{6}$")
            .When(x => !string.IsNullOrWhiteSpace(x.ColorHex))
            .WithMessage("ColorHex must be a valid 7-character hex color (e.g., #2A6B58).");
    }
}

public sealed record UpdateCategoryCommand(
    Guid Id,
    string Name,
    string? ColorHex,
    bool IsArchived);

public sealed class CategoryHandlers
{
    private readonly IVaultzDbContext _dbContext;
    private readonly ICurrentUserService _currentUser;
    private readonly IValidator<CreateCategoryCommand> _createValidator;

    public CategoryHandlers(
        IVaultzDbContext dbContext,
        ICurrentUserService currentUser,
        IValidator<CreateCategoryCommand> createValidator)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
        _createValidator = createValidator;
    }

    public async Task<IReadOnlyList<CategoryResponse>> GetCategoriesAsync(
        Guid? accountId = null,
        CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();

        var query = _dbContext.Categories
            .AsNoTracking()
            .Where(c => c.UserId == userId && !c.IsArchived);

        if (accountId.HasValue)
        {
            query = query.Where(c => c.AccountId == null || c.AccountId == accountId.Value);
        }

        var categories = await query
            .OrderBy(c => c.Type)
            .ThenBy(c => c.Name)
            .ToListAsync(cancellationToken);

        var accounts = await _dbContext.Accounts
            .AsNoTracking()
            .Where(a => a.UserId == userId)
            .ToDictionaryAsync(a => a.Id, a => a.Name, cancellationToken);

        return categories.Select(c => MapToResponse(c, accounts)).ToList();
    }

    public async Task<CategoryResponse> CreateCategoryAsync(
        CreateCategoryCommand command,
        CancellationToken cancellationToken = default)
    {
        var validation = await _createValidator.ValidateAsync(command, cancellationToken);
        if (!validation.IsValid)
        {
            throw new AppValidationException(validation.Errors);
        }

        var userId = _currentUser.GetRequiredUserId();

        string? accountName = null;
        if (command.AccountId.HasValue)
        {
            var account = await _dbContext.Accounts
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == command.AccountId.Value && a.UserId == userId, cancellationToken)
                ?? throw new NotFoundException(nameof(FinancialAccount), command.AccountId.Value);
            accountName = account.Name;
        }

        var category = new Category(
            userId,
            command.Name,
            command.Type,
            command.ColorHex,
            command.AccountId);

        _dbContext.Categories.Add(category);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new CategoryResponse(
            category.Id,
            category.Name,
            category.Type,
            category.Type.ToString(),
            category.ColorHex,
            category.IsArchived,
            category.AccountId,
            accountName);
    }

    public async Task<CategoryResponse> UpdateCategoryAsync(
        UpdateCategoryCommand command,
        CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();
        var category = await _dbContext.Categories
            .FirstOrDefaultAsync(c => c.Id == command.Id && c.UserId == userId, cancellationToken)
            ?? throw new NotFoundException(nameof(Category), command.Id);

        category.Update(command.Name, command.ColorHex, command.IsArchived);
        await _dbContext.SaveChangesAsync(cancellationToken);

        string? accountName = null;
        if (category.AccountId.HasValue)
        {
            var account = await _dbContext.Accounts
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == category.AccountId.Value && a.UserId == userId, cancellationToken);
            accountName = account?.Name;
        }

        return new CategoryResponse(
            category.Id,
            category.Name,
            category.Type,
            category.Type.ToString(),
            category.ColorHex,
            category.IsArchived,
            category.AccountId,
            accountName);
    }

    public async Task DeleteCategoryAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();
        var category = await _dbContext.Categories
            .FirstOrDefaultAsync(c => c.Id == id && c.UserId == userId, cancellationToken)
            ?? throw new NotFoundException(nameof(Category), id);

        _dbContext.Categories.Remove(category);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private static CategoryResponse MapToResponse(
        Category category,
        IReadOnlyDictionary<Guid, string>? accounts = null) =>
        new(
            category.Id,
            category.Name,
            category.Type,
            category.Type.ToString(),
            category.ColorHex,
            category.IsArchived,
            category.AccountId,
            category.AccountId.HasValue && accounts != null && accounts.TryGetValue(category.AccountId.Value, out var name)
                ? name
                : null);
}
