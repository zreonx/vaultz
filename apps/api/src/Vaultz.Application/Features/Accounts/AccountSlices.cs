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
    AccountType Type,
    bool IsArchived);

public sealed class UpdateAccountValidator : AbstractValidator<UpdateAccountCommand>
{
    public UpdateAccountValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Type).IsInEnum();
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

        account.UpdateDetails(command.Name, command.Type, command.IsArchived);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return MapToResponse(account);
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
