using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Vaultz.Application.Common.Exceptions;
using Vaultz.Application.Common.Interfaces;
using Vaultz.Domain.Common;
using Vaultz.Domain.Entities;
using Vaultz.Domain.Enums;

namespace Vaultz.Application.Features.AccountAllocations;

public sealed record AccountAllocationDto(
    Guid Id,
    Guid AccountId,
    string Name,
    AllocationCategory Category,
    string CategoryName,
    decimal Balance,
    decimal? TargetAmount,
    string? Color,
    string? Icon,
    bool IsArchived,
    DateTimeOffset CreatedAtUtc);

public sealed record MonthlyBudgetSliceDto(
    Guid Id,
    Guid MonthlyBudgetPlanId,
    Guid? CategoryId,
    string? CategoryName,
    string Name,
    decimal AllocationPercentage,
    decimal AllocatedAmount,
    decimal SpentAmount,
    decimal RemainingAmount,
    string? Color);

public sealed record MonthlyBudgetPlanDto(
    Guid Id,
    Guid AccountId,
    int Year,
    int Month,
    decimal TotalBudgetAmount,
    decimal TotalAllocated,
    decimal TotalSpent,
    decimal TotalRemaining,
    bool IsActive,
    bool IsSwept,
    DateTimeOffset? SweptAtUtc,
    Guid? SweptToAllocationId,
    string? SweptToAllocationName,
    IReadOnlyList<MonthlyBudgetSliceDto> Slices);

public sealed record AccountAllocationsOverviewResponse(
    Guid AccountId,
    string AccountName,
    string CurrencyCode,
    decimal AccountBalance,
    decimal TotalAllocatedInVaults,
    decimal ActivePlanRemaining,
    decimal UnallocatedBalance,
    IReadOnlyList<AccountAllocationDto> Allocations,
    MonthlyBudgetPlanDto? ActiveBudgetPlan);

public sealed record CreateAccountAllocationCommand(
    Guid AccountId,
    string Name,
    AllocationCategory Category,
    decimal InitialBalance = 0m,
    decimal? TargetAmount = null,
    string? Color = null,
    string? Icon = null);

public sealed class CreateAccountAllocationValidator : AbstractValidator<CreateAccountAllocationCommand>
{
    public CreateAccountAllocationValidator()
    {
        RuleFor(x => x.AccountId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Category).IsInEnum();
        RuleFor(x => x.InitialBalance).GreaterThanOrEqualTo(0m);
        RuleFor(x => x.TargetAmount).GreaterThan(0m).When(x => x.TargetAmount.HasValue);
    }
}

public sealed record UpdateAccountAllocationCommand(
    Guid Id,
    Guid AccountId,
    string Name,
    AllocationCategory Category,
    decimal? TargetAmount = null,
    string? Color = null,
    string? Icon = null);

public sealed class UpdateAccountAllocationValidator : AbstractValidator<UpdateAccountAllocationCommand>
{
    public UpdateAccountAllocationValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.AccountId).NotEmpty();
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Category).IsInEnum();
        RuleFor(x => x.TargetAmount).GreaterThan(0m).When(x => x.TargetAmount.HasValue);
    }
}

public sealed record AllocationAmountTransferCommand(
    Guid Id,
    Guid AccountId,
    decimal Amount);

public sealed class AllocationAmountTransferValidator : AbstractValidator<AllocationAmountTransferCommand>
{
    public AllocationAmountTransferValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.AccountId).NotEmpty();
        RuleFor(x => x.Amount).GreaterThan(0m);
    }
}

public sealed record CreateMonthlyBudgetSliceInput(
    string Name,
    decimal AllocationPercentage,
    Guid? CategoryId = null,
    string? Color = null);

public sealed record CreateMonthlyBudgetPlanCommand(
    Guid AccountId,
    int Year,
    int Month,
    decimal TotalBudgetAmount,
    IReadOnlyList<CreateMonthlyBudgetSliceInput> Slices);

public sealed class CreateMonthlyBudgetPlanValidator : AbstractValidator<CreateMonthlyBudgetPlanCommand>
{
    public CreateMonthlyBudgetPlanValidator()
    {
        RuleFor(x => x.AccountId).NotEmpty();
        RuleFor(x => x.Year).InclusiveBetween(2000, 2100);
        RuleFor(x => x.Month).InclusiveBetween(1, 12);
        RuleFor(x => x.TotalBudgetAmount).GreaterThan(0m);
        RuleFor(x => x.Slices).NotEmpty().WithMessage("At least one budget slice is required.");
        RuleForEach(x => x.Slices).ChildRules(slice =>
        {
            slice.RuleFor(s => s.Name).NotEmpty().MaximumLength(100);
            slice.RuleFor(s => s.AllocationPercentage).InclusiveBetween(0.01m, 100m);
        });
        RuleFor(x => x.Slices)
            .Must(slices =>
            {
                if (slices == null || slices.Count == 0) return true;
                var sum = slices.Sum(s => s.AllocationPercentage);
                return Math.Abs(sum - 100m) <= 0.01m;
            })
            .WithMessage("The sum of slice percentages must equal exactly 100%.");
    }
}

public sealed record CoverSliceDeficitCommand(
    Guid AccountId,
    Guid PlanId,
    Guid FromSliceId,
    Guid ToSliceId,
    decimal Amount);

public sealed class CoverSliceDeficitValidator : AbstractValidator<CoverSliceDeficitCommand>
{
    public CoverSliceDeficitValidator()
    {
        RuleFor(x => x.AccountId).NotEmpty();
        RuleFor(x => x.PlanId).NotEmpty();
        RuleFor(x => x.FromSliceId).NotEmpty();
        RuleFor(x => x.ToSliceId).NotEmpty().NotEqual(x => x.FromSliceId).WithMessage("Source and target slices must be different.");
        RuleFor(x => x.Amount).GreaterThan(0m);
    }
}

public sealed record SweepMonthlyBudgetPlanCommand(
    Guid AccountId,
    Guid PlanId,
    Guid? TargetAllocationId = null);

public sealed class AccountAllocationHandlers
{
    private readonly IVaultzDbContext _dbContext;
    private readonly ICurrentUserService _currentUser;
    private readonly IValidator<CreateAccountAllocationCommand> _createValidator;
    private readonly IValidator<UpdateAccountAllocationCommand> _updateValidator;
    private readonly IValidator<AllocationAmountTransferCommand> _transferValidator;
    private readonly IValidator<CreateMonthlyBudgetPlanCommand> _createPlanValidator;
    private readonly IValidator<CoverSliceDeficitCommand> _coverDeficitValidator;

    public AccountAllocationHandlers(
        IVaultzDbContext dbContext,
        ICurrentUserService currentUser,
        IValidator<CreateAccountAllocationCommand> createValidator,
        IValidator<UpdateAccountAllocationCommand> updateValidator,
        IValidator<AllocationAmountTransferCommand> transferValidator,
        IValidator<CreateMonthlyBudgetPlanCommand> createPlanValidator,
        IValidator<CoverSliceDeficitCommand> coverDeficitValidator)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _transferValidator = transferValidator;
        _createPlanValidator = createPlanValidator;
        _coverDeficitValidator = coverDeficitValidator;
    }

    public async Task<AccountAllocationsOverviewResponse> GetOverviewAsync(
        Guid accountId,
        CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();

        var account = await _dbContext.Accounts
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == accountId && a.UserId == userId, cancellationToken)
            ?? throw new NotFoundException(nameof(FinancialAccount), accountId);

        var allocations = await _dbContext.AccountAllocations
            .AsNoTracking()
            .Where(a => a.AccountId == accountId && a.UserId == userId && !a.IsArchived)
            .OrderBy(a => a.Category)
            .ThenBy(a => a.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        var activePlan = await _dbContext.MonthlyBudgetPlans
            .Include(p => p.Slices)
            .AsNoTracking()
            .Where(p => p.AccountId == accountId && p.UserId == userId && p.IsActive)
            .OrderByDescending(p => p.Year)
            .ThenByDescending(p => p.Month)
            .FirstOrDefaultAsync(cancellationToken);

        var totalAllocatedInVaults = allocations.Sum(a => a.Balance);
        var activePlanRemaining = activePlan?.TotalRemaining ?? 0m;
        var unallocatedBalance = Math.Max(0m, account.Balance - totalAllocatedInVaults - activePlanRemaining);

        var categoryNames = new Dictionary<Guid, string>();
        if (activePlan != null)
        {
            var categoryIds = activePlan.Slices
                .Where(s => s.CategoryId.HasValue)
                .Select(s => s.CategoryId!.Value)
                .Distinct()
                .ToList();

            if (categoryIds.Count > 0)
            {
                categoryNames = await _dbContext.Categories
                    .AsNoTracking()
                    .Where(c => categoryIds.Contains(c.Id))
                    .ToDictionaryAsync(c => c.Id, c => c.Name, cancellationToken);
            }
        }

        MonthlyBudgetPlanDto? activePlanDto = null;
        if (activePlan != null)
        {
            string? sweptTargetName = null;
            if (activePlan.SweptToAllocationId.HasValue)
            {
                var target = allocations.FirstOrDefault(a => a.Id == activePlan.SweptToAllocationId.Value);
                sweptTargetName = target?.Name;
            }

            var slices = activePlan.Slices
                .Select(s => new MonthlyBudgetSliceDto(
                    s.Id,
                    s.MonthlyBudgetPlanId,
                    s.CategoryId,
                    s.CategoryId.HasValue && categoryNames.TryGetValue(s.CategoryId.Value, out var cName) ? cName : null,
                    s.Name,
                    s.AllocationPercentage,
                    s.AllocatedAmount,
                    s.SpentAmount,
                    s.RemainingAmount,
                    s.Color))
                .ToList();

            activePlanDto = new MonthlyBudgetPlanDto(
                activePlan.Id,
                activePlan.AccountId,
                activePlan.Year,
                activePlan.Month,
                activePlan.TotalBudgetAmount,
                activePlan.TotalAllocated,
                activePlan.TotalSpent,
                activePlan.TotalRemaining,
                activePlan.IsActive,
                activePlan.IsSwept,
                activePlan.SweptAtUtc,
                activePlan.SweptToAllocationId,
                sweptTargetName,
                slices);
        }

        var allocationDtos = allocations.Select(a => new AccountAllocationDto(
            a.Id,
            a.AccountId,
            a.Name,
            a.Category,
            a.Category.ToString(),
            a.Balance,
            a.TargetAmount,
            a.Color,
            a.Icon,
            a.IsArchived,
            a.CreatedAtUtc)).ToList();

        return new AccountAllocationsOverviewResponse(
            account.Id,
            account.Name,
            account.CurrencyCode,
            account.Balance,
            totalAllocatedInVaults,
            activePlanRemaining,
            unallocatedBalance,
            allocationDtos,
            activePlanDto);
    }

    public async Task<AccountAllocationDto> CreateAllocationAsync(
        CreateAccountAllocationCommand command,
        CancellationToken cancellationToken = default)
    {
        var validation = await _createValidator.ValidateAsync(command, cancellationToken);
        if (!validation.IsValid)
        {
            throw new AppValidationException(validation.Errors);
        }

        var userId = _currentUser.GetRequiredUserId();
        AccountAllocation? created = null;

        await _dbContext.ExecuteInTransactionAsync(async ct =>
        {
            var account = await _dbContext.Accounts
                .FirstOrDefaultAsync(a => a.Id == command.AccountId && a.UserId == userId, ct)
                ?? throw new NotFoundException(nameof(FinancialAccount), command.AccountId);

            if (command.InitialBalance > 0m)
            {
                var existingAllocationsSum = await _dbContext.AccountAllocations
                    .Where(a => a.AccountId == command.AccountId && a.UserId == userId && !a.IsArchived)
                    .SumAsync(a => a.Balance, ct);

                var activePlanRemaining = await _dbContext.MonthlyBudgetPlans
                    .Where(p => p.AccountId == command.AccountId && p.UserId == userId && p.IsActive)
                    .Select(p => (decimal?)p.TotalBudgetAmount)
                    .FirstOrDefaultAsync(ct) ?? 0m;

                var available = account.Balance - existingAllocationsSum - activePlanRemaining;
                if (command.InitialBalance > available)
                {
                    throw new DomainException(
                        $"Initial balance {command.InitialBalance:N2} exceeds available unallocated account balance {available:N2}.",
                        "insufficient_available_balance");
                }
            }

            created = new AccountAllocation(
                userId,
                command.AccountId,
                command.Name,
                command.Category,
                command.InitialBalance,
                command.TargetAmount,
                command.Color,
                command.Icon);

            _dbContext.AccountAllocations.Add(created);
            await _dbContext.SaveChangesAsync(ct);
        }, cancellationToken);

        return new AccountAllocationDto(
            created!.Id,
            created.AccountId,
            created.Name,
            created.Category,
            created.Category.ToString(),
            created.Balance,
            created.TargetAmount,
            created.Color,
            created.Icon,
            created.IsArchived,
            created.CreatedAtUtc);
    }

    public async Task<AccountAllocationDto> UpdateAllocationAsync(
        UpdateAccountAllocationCommand command,
        CancellationToken cancellationToken = default)
    {
        var validation = await _updateValidator.ValidateAsync(command, cancellationToken);
        if (!validation.IsValid)
        {
            throw new AppValidationException(validation.Errors);
        }

        var userId = _currentUser.GetRequiredUserId();
        var allocation = await _dbContext.AccountAllocations
            .FirstOrDefaultAsync(a => a.Id == command.Id && a.AccountId == command.AccountId && a.UserId == userId, cancellationToken)
            ?? throw new NotFoundException(nameof(AccountAllocation), command.Id);

        allocation.UpdateDetails(
            command.Name,
            command.Category,
            command.TargetAmount,
            command.Color,
            command.Icon);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return new AccountAllocationDto(
            allocation.Id,
            allocation.AccountId,
            allocation.Name,
            allocation.Category,
            allocation.Category.ToString(),
            allocation.Balance,
            allocation.TargetAmount,
            allocation.Color,
            allocation.Icon,
            allocation.IsArchived,
            allocation.CreatedAtUtc);
    }

    public async Task DepositAsync(
        AllocationAmountTransferCommand command,
        CancellationToken cancellationToken = default)
    {
        var validation = await _transferValidator.ValidateAsync(command, cancellationToken);
        if (!validation.IsValid)
        {
            throw new AppValidationException(validation.Errors);
        }

        var userId = _currentUser.GetRequiredUserId();

        await _dbContext.ExecuteInTransactionAsync(async ct =>
        {
            var account = await _dbContext.Accounts
                .FirstOrDefaultAsync(a => a.Id == command.AccountId && a.UserId == userId, ct)
                ?? throw new NotFoundException(nameof(FinancialAccount), command.AccountId);

            var allocation = await _dbContext.AccountAllocations
                .FirstOrDefaultAsync(a => a.Id == command.Id && a.AccountId == command.AccountId && a.UserId == userId, ct)
                ?? throw new NotFoundException(nameof(AccountAllocation), command.Id);

            var existingAllocationsSum = await _dbContext.AccountAllocations
                .Where(a => a.AccountId == command.AccountId && a.UserId == userId && !a.IsArchived)
                .SumAsync(a => a.Balance, ct);

            var activePlanRemaining = await _dbContext.MonthlyBudgetPlans
                .Where(p => p.AccountId == command.AccountId && p.UserId == userId && p.IsActive)
                .Select(p => (decimal?)p.TotalBudgetAmount)
                .FirstOrDefaultAsync(ct) ?? 0m;

            var available = account.Balance - existingAllocationsSum - activePlanRemaining;
            if (command.Amount > available)
            {
                throw new DomainException(
                    $"Deposit amount {command.Amount:N2} exceeds available unallocated account balance {available:N2}.",
                    "insufficient_available_balance");
            }

            allocation.Deposit(command.Amount);
            await _dbContext.SaveChangesAsync(ct);
        }, cancellationToken);
    }

    public async Task WithdrawAsync(
        AllocationAmountTransferCommand command,
        CancellationToken cancellationToken = default)
    {
        var validation = await _transferValidator.ValidateAsync(command, cancellationToken);
        if (!validation.IsValid)
        {
            throw new AppValidationException(validation.Errors);
        }

        var userId = _currentUser.GetRequiredUserId();

        await _dbContext.ExecuteInTransactionAsync(async ct =>
        {
            var allocation = await _dbContext.AccountAllocations
                .FirstOrDefaultAsync(a => a.Id == command.Id && a.AccountId == command.AccountId && a.UserId == userId, ct)
                ?? throw new NotFoundException(nameof(AccountAllocation), command.Id);

            allocation.Withdraw(command.Amount);
            await _dbContext.SaveChangesAsync(ct);
        }, cancellationToken);
    }

    public async Task DeleteAllocationAsync(
        Guid accountId,
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();

        await _dbContext.ExecuteInTransactionAsync(async ct =>
        {
            var allocation = await _dbContext.AccountAllocations
                .FirstOrDefaultAsync(a => a.Id == id && a.AccountId == accountId && a.UserId == userId, ct)
                ?? throw new NotFoundException(nameof(AccountAllocation), id);

            // Removing an allocation automatically returns all its funds to the account's unallocated pool
            _dbContext.AccountAllocations.Remove(allocation);
            await _dbContext.SaveChangesAsync(ct);
        }, cancellationToken);
    }

    public async Task<MonthlyBudgetPlanDto> CreateMonthlyPlanAsync(
        CreateMonthlyBudgetPlanCommand command,
        CancellationToken cancellationToken = default)
    {
        var validation = await _createPlanValidator.ValidateAsync(command, cancellationToken);
        if (!validation.IsValid)
        {
            throw new AppValidationException(validation.Errors);
        }

        var userId = _currentUser.GetRequiredUserId();
        MonthlyBudgetPlan? plan = null;

        await _dbContext.ExecuteInTransactionAsync(async ct =>
        {
            var account = await _dbContext.Accounts
                .FirstOrDefaultAsync(a => a.Id == command.AccountId && a.UserId == userId, ct)
                ?? throw new NotFoundException(nameof(FinancialAccount), command.AccountId);

            var existingAllocationsSum = await _dbContext.AccountAllocations
                .Where(a => a.AccountId == command.AccountId && a.UserId == userId && !a.IsArchived)
                .SumAsync(a => a.Balance, ct);

            // Close any existing active plans for this account
            var activePlans = await _dbContext.MonthlyBudgetPlans
                .Where(p => p.AccountId == command.AccountId && p.UserId == userId && p.IsActive)
                .ToListAsync(ct);

            foreach (var existingActive in activePlans)
            {
                existingActive.ClosePlan();
            }

            var available = account.Balance - existingAllocationsSum;
            if (command.TotalBudgetAmount > available)
            {
                throw new DomainException(
                    $"Requested budget {command.TotalBudgetAmount:N2} exceeds available unallocated balance {available:N2}.",
                    "insufficient_available_balance");
            }

            plan = new MonthlyBudgetPlan(
                userId,
                command.AccountId,
                command.Year,
                command.Month,
                command.TotalBudgetAmount);

            _dbContext.MonthlyBudgetPlans.Add(plan);
            await _dbContext.SaveChangesAsync(ct);

            // Distribute exact amounts using Largest Remainder Method
            var sliceDistributions = DistributeSliceAmounts(command.TotalBudgetAmount, command.Slices);
            foreach (var item in sliceDistributions)
            {
                var slice = new MonthlyBudgetSlice(
                    userId,
                    plan.Id,
                    item.Input.Name,
                    item.Input.AllocationPercentage,
                    item.AllocatedAmount,
                    item.Input.CategoryId,
                    item.Input.Color);

                plan.AddSlice(slice);
                _dbContext.MonthlyBudgetSlices.Add(slice);
            }

            await _dbContext.SaveChangesAsync(ct);
        }, cancellationToken);

        return (await GetOverviewAsync(command.AccountId, cancellationToken)).ActiveBudgetPlan!;
    }

    public async Task CoverDeficitAsync(
        CoverSliceDeficitCommand command,
        CancellationToken cancellationToken = default)
    {
        var validation = await _coverDeficitValidator.ValidateAsync(command, cancellationToken);
        if (!validation.IsValid)
        {
            throw new AppValidationException(validation.Errors);
        }

        var userId = _currentUser.GetRequiredUserId();

        await _dbContext.ExecuteInTransactionAsync(async ct =>
        {
            var plan = await _dbContext.MonthlyBudgetPlans
                .Include(p => p.Slices)
                .FirstOrDefaultAsync(p => p.Id == command.PlanId && p.AccountId == command.AccountId && p.UserId == userId, ct)
                ?? throw new NotFoundException(nameof(MonthlyBudgetPlan), command.PlanId);

            var fromSlice = plan.Slices.FirstOrDefault(s => s.Id == command.FromSliceId)
                ?? throw new NotFoundException(nameof(MonthlyBudgetSlice), command.FromSliceId);

            var toSlice = plan.Slices.FirstOrDefault(s => s.Id == command.ToSliceId)
                ?? throw new NotFoundException(nameof(MonthlyBudgetSlice), command.ToSliceId);

            if (fromSlice.RemainingAmount < command.Amount)
            {
                throw new DomainException(
                    $"Source slice '{fromSlice.Name}' only has {fromSlice.RemainingAmount:N2} remaining to cover the requested deficit {command.Amount:N2}.",
                    "insufficient_slice_funds");
            }

            fromSlice.AdjustAllocation(-command.Amount);
            toSlice.AdjustAllocation(command.Amount);

            await _dbContext.SaveChangesAsync(ct);
        }, cancellationToken);
    }

    public async Task SweepPlanAsync(
        SweepMonthlyBudgetPlanCommand command,
        CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();

        await _dbContext.ExecuteInTransactionAsync(async ct =>
        {
            var plan = await _dbContext.MonthlyBudgetPlans
                .Include(p => p.Slices)
                .FirstOrDefaultAsync(p => p.Id == command.PlanId && p.AccountId == command.AccountId && p.UserId == userId, ct)
                ?? throw new NotFoundException(nameof(MonthlyBudgetPlan), command.PlanId);

            if (plan.IsSwept)
            {
                throw new DomainException("This budget plan has already been swept.", "already_swept");
            }

            var unspentTotal = plan.TotalRemaining;
            if (unspentTotal > 0m && command.TargetAllocationId.HasValue)
            {
                var targetAllocation = await _dbContext.AccountAllocations
                    .FirstOrDefaultAsync(a => a.Id == command.TargetAllocationId.Value && a.AccountId == command.AccountId && a.UserId == userId, ct)
                    ?? throw new NotFoundException(nameof(AccountAllocation), command.TargetAllocationId.Value);

                targetAllocation.Deposit(unspentTotal);
            }

            plan.Sweep(command.TargetAllocationId);
            await _dbContext.SaveChangesAsync(ct);
        }, cancellationToken);
    }

    public async Task ClosePlanAsync(
        Guid accountId,
        Guid planId,
        CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();

        await _dbContext.ExecuteInTransactionAsync(async ct =>
        {
            var plan = await _dbContext.MonthlyBudgetPlans
                .FirstOrDefaultAsync(p => p.Id == planId && p.AccountId == accountId && p.UserId == userId, ct)
                ?? throw new NotFoundException(nameof(MonthlyBudgetPlan), planId);

            plan.ClosePlan();
            await _dbContext.SaveChangesAsync(ct);
        }, cancellationToken);
    }

    private static List<(CreateMonthlyBudgetSliceInput Input, decimal AllocatedAmount)> DistributeSliceAmounts(
        decimal totalBudget,
        IReadOnlyList<CreateMonthlyBudgetSliceInput> slices)
    {
        var totalCents = (long)Math.Round(totalBudget * 100m, MidpointRounding.AwayFromZero);
        var rawAmounts = new List<(CreateMonthlyBudgetSliceInput Slice, long FloorCents, decimal Remainder)>();

        long sumFlooredCents = 0;
        foreach (var slice in slices)
        {
            var rawCents = (slice.AllocationPercentage / 100m) * totalCents;
            var floorCents = (long)Math.Floor(rawCents);
            var remainder = rawCents - floorCents;
            rawAmounts.Add((slice, floorCents, remainder));
            sumFlooredCents += floorCents;
        }

        var centsToDistribute = totalCents - sumFlooredCents;
        var indexed = rawAmounts.Select((item, index) => (item.Slice, item.FloorCents, item.Remainder, OriginalIndex: index)).ToList();
        var sortedByRemainder = indexed.OrderByDescending(x => x.Remainder).ToList();

        var amountsByIndex = new Dictionary<int, decimal>();
        for (int i = 0; i < sortedByRemainder.Count; i++)
        {
            var extra = i < centsToDistribute ? 1L : 0L;
            var finalCents = sortedByRemainder[i].FloorCents + extra;
            amountsByIndex[sortedByRemainder[i].OriginalIndex] = finalCents / 100m;
        }

        var result = new List<(CreateMonthlyBudgetSliceInput, decimal)>();
        for (int i = 0; i < slices.Count; i++)
        {
            result.Add((slices[i], amountsByIndex[i]));
        }

        return result;
    }
}
