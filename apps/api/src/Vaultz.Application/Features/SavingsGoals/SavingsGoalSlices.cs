using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Vaultz.Application.Common.Exceptions;
using Vaultz.Application.Common.Interfaces;
using Vaultz.Domain.Entities;
using Vaultz.Domain.Enums;

namespace Vaultz.Application.Features.SavingsGoals;

public sealed record SavingsGoalResponse(
    Guid Id,
    string Name,
    decimal TargetAmount,
    decimal CurrentAmount,
    decimal RemainingAmount,
    decimal ProgressPercent,
    string CurrencyCode,
    DateOnly? TargetDate,
    DateTimeOffset CreatedAtUtc,
    Guid? AccountId = null,
    string? AccountName = null);

public sealed record CreateSavingsGoalCommand(
    string Name,
    decimal TargetAmount,
    string CurrencyCode,
    decimal InitialAmount = 0m,
    DateOnly? TargetDate = null,
    Guid? AccountId = null);

public sealed class CreateSavingsGoalValidator : AbstractValidator<CreateSavingsGoalCommand>
{
    public CreateSavingsGoalValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.TargetAmount).GreaterThan(0m);
        RuleFor(x => x.InitialAmount).GreaterThanOrEqualTo(0m);
        RuleFor(x => x.CurrencyCode)
            .NotEmpty()
            .Length(3)
            .Matches("^[A-Za-z]{3}$");
    }
}

public sealed record AdjustSavingsGoalCommand(
    Guid Id,
    decimal Amount,
    bool IsWithdrawal = false);

public sealed class AdjustSavingsGoalValidator : AbstractValidator<AdjustSavingsGoalCommand>
{
    public AdjustSavingsGoalValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Amount).GreaterThan(0m);
    }
}

public sealed class SavingsGoalHandlers
{
    private readonly IVaultzDbContext _dbContext;
    private readonly ICurrentUserService _currentUser;
    private readonly IValidator<CreateSavingsGoalCommand> _createValidator;
    private readonly IValidator<AdjustSavingsGoalCommand> _adjustValidator;
    private readonly INotificationService? _notificationService;

    public SavingsGoalHandlers(
        IVaultzDbContext dbContext,
        ICurrentUserService currentUser,
        IValidator<CreateSavingsGoalCommand> createValidator,
        IValidator<AdjustSavingsGoalCommand> adjustValidator,
        INotificationService? notificationService = null)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
        _createValidator = createValidator;
        _adjustValidator = adjustValidator;
        _notificationService = notificationService;
    }

    public async Task<IReadOnlyList<SavingsGoalResponse>> GetSavingsGoalsAsync(
        Guid? accountId = null,
        CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();
        var query = _dbContext.SavingsGoals
            .AsNoTracking()
            .Where(g => g.UserId == userId);

        if (accountId.HasValue)
        {
            query = query.Where(g => g.AccountId == accountId.Value);
        }

        var goals = await query
            .OrderBy(g => g.TargetDate ?? DateOnly.MaxValue)
            .ThenBy(g => g.Name)
            .ToListAsync(cancellationToken);

        var accounts = await _dbContext.Accounts
            .AsNoTracking()
            .Where(a => a.UserId == userId)
            .ToDictionaryAsync(a => a.Id, a => a.Name, cancellationToken);

        return goals.Select(g => MapToResponse(g, accounts)).ToList();
    }

    public async Task<SavingsGoalResponse> CreateSavingsGoalAsync(
        CreateSavingsGoalCommand command,
        CancellationToken cancellationToken = default)
    {
        var validation = await _createValidator.ValidateAsync(command, cancellationToken);
        if (!validation.IsValid)
        {
            throw new AppValidationException(validation.Errors);
        }

        var userId = _currentUser.GetRequiredUserId();
        var currency = command.CurrencyCode.Trim().ToUpperInvariant();

        string? accountName = null;
        if (command.AccountId.HasValue)
        {
            var account = await _dbContext.Accounts
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == command.AccountId.Value && a.UserId == userId, cancellationToken)
                ?? throw new NotFoundException(nameof(FinancialAccount), command.AccountId.Value);

            accountName = account.Name;
            currency = account.CurrencyCode;
        }

        var goal = new SavingsGoal(
            userId,
            command.Name,
            command.TargetAmount,
            currency,
            command.InitialAmount,
            command.TargetDate,
            command.AccountId);

        _dbContext.SavingsGoals.Add(goal);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var response = MapToResponse(goal);
        return response with { AccountName = accountName };
    }

    public async Task<SavingsGoalResponse> AdjustSavingsGoalAsync(
        AdjustSavingsGoalCommand command,
        CancellationToken cancellationToken = default)
    {
        var validation = await _adjustValidator.ValidateAsync(command, cancellationToken);
        if (!validation.IsValid)
        {
            throw new AppValidationException(validation.Errors);
        }

        var userId = _currentUser.GetRequiredUserId();
        var goal = await _dbContext.SavingsGoals
            .FirstOrDefaultAsync(g => g.Id == command.Id && g.UserId == userId, cancellationToken)
            ?? throw new NotFoundException(nameof(SavingsGoal), command.Id);

        if (command.IsWithdrawal)
        {
            goal.Withdraw(command.Amount);
        }
        else
        {
            goal.Contribute(command.Amount);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        if (_notificationService != null && !command.IsWithdrawal && goal.CurrentAmount >= goal.TargetAmount)
        {
            await _notificationService.SendAsync(
                userId,
                "Savings Goal Milestone Reached! 🎉",
                $"Congratulations! You have reached 100% of your target for '{goal.Name}' ({goal.CurrentAmount:N2} / {goal.TargetAmount:N2} {goal.CurrencyCode}).",
                NotificationType.SavingsGoalMilestone,
                actionUrl: "/savings-goals",
                cancellationToken: cancellationToken);
        }

        string? accountName = null;
        if (goal.AccountId.HasValue)
        {
            var account = await _dbContext.Accounts
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == goal.AccountId.Value && a.UserId == userId, cancellationToken);
            accountName = account?.Name;
        }

        var response = MapToResponse(goal);
        return response with { AccountName = accountName };
    }

    public async Task DeleteSavingsGoalAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();
        var goal = await _dbContext.SavingsGoals
            .FirstOrDefaultAsync(g => g.Id == id && g.UserId == userId, cancellationToken)
            ?? throw new NotFoundException(nameof(SavingsGoal), id);

        _dbContext.SavingsGoals.Remove(goal);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private static SavingsGoalResponse MapToResponse(
        SavingsGoal goal,
        IReadOnlyDictionary<Guid, string>? accounts = null)
    {
        var remaining = Math.Max(0m, goal.TargetAmount - goal.CurrentAmount);
        var progress = goal.TargetAmount > 0m
            ? Math.Min(100m, decimal.Round((goal.CurrentAmount / goal.TargetAmount) * 100m, 2, MidpointRounding.ToEven))
            : 0m;

        string? accountName = null;
        if (goal.AccountId.HasValue && accounts != null && accounts.TryGetValue(goal.AccountId.Value, out var name))
        {
            accountName = name;
        }

        return new SavingsGoalResponse(
            goal.Id,
            goal.Name,
            goal.TargetAmount,
            goal.CurrentAmount,
            remaining,
            progress,
            goal.CurrencyCode,
            goal.TargetDate,
            goal.CreatedAtUtc,
            goal.AccountId,
            accountName);
    }
}
