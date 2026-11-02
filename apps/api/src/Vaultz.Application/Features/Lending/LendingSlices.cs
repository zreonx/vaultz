using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Vaultz.Application.Common.Exceptions;
using Vaultz.Application.Common.Interfaces;
using Vaultz.Domain.Entities;
using Vaultz.Domain.Enums;

namespace Vaultz.Application.Features.Lending;

public sealed record LendingPaymentResponse(
    Guid Id,
    Guid LendingRecordId,
    decimal Amount,
    string CurrencyCode,
    DateOnly OccurredOn,
    string? Notes,
    DateTimeOffset CreatedAtUtc);

public sealed record LendingRecordResponse(
    Guid Id,
    Guid AccountId,
    string AccountName,
    LendingType Type,
    string TypeName,
    string Counterparty,
    decimal OriginalAmount,
    decimal RemainingAmount,
    decimal RepaidAmount,
    decimal ProgressPercent,
    string CurrencyCode,
    DateOnly? DueDate,
    string? Notes,
    LendingStatus Status,
    string StatusName,
    DateTimeOffset CreatedAtUtc,
    IReadOnlyList<LendingPaymentResponse> Payments);

public sealed record LendingSummaryResponse(
    decimal TotalLentRemaining,
    decimal TotalBorrowedRemaining,
    decimal NetPosition,
    string CurrencyCode,
    int ActiveLentCount,
    int ActiveBorrowedCount,
    IReadOnlyList<LendingRecordResponse> Records);

public sealed record CreateLendingRecordCommand(
    Guid AccountId,
    LendingType Type,
    string Counterparty,
    decimal Amount,
    DateOnly? DueDate = null,
    string? Notes = null,
    bool SyncAccountBalance = true);

public sealed class CreateLendingRecordValidator : AbstractValidator<CreateLendingRecordCommand>
{
    public CreateLendingRecordValidator()
    {
        RuleFor(x => x.AccountId).NotEmpty();
        RuleFor(x => x.Type).IsInEnum();
        RuleFor(x => x.Counterparty).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Amount).GreaterThan(0m);
        RuleFor(x => x.Notes).MaximumLength(500);
    }
}

public sealed record RecordLendingPaymentCommand(
    Guid LendingRecordId,
    decimal Amount,
    DateOnly OccurredOn,
    string? Notes = null,
    bool SyncAccountBalance = true);

public sealed class RecordLendingPaymentValidator : AbstractValidator<RecordLendingPaymentCommand>
{
    public RecordLendingPaymentValidator()
    {
        RuleFor(x => x.LendingRecordId).NotEmpty();
        RuleFor(x => x.Amount).GreaterThan(0m);
        RuleFor(x => x.Notes).MaximumLength(500);
    }
}

public sealed class LendingHandlers
{
    private readonly IVaultzDbContext _dbContext;
    private readonly ICurrentUserService _currentUser;
    private readonly IValidator<CreateLendingRecordCommand> _createValidator;
    private readonly IValidator<RecordLendingPaymentCommand> _paymentValidator;
    private readonly INotificationService? _notificationService;

    public LendingHandlers(
        IVaultzDbContext dbContext,
        ICurrentUserService currentUser,
        IValidator<CreateLendingRecordCommand> createValidator,
        IValidator<RecordLendingPaymentCommand> paymentValidator,
        INotificationService? notificationService = null)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
        _createValidator = createValidator;
        _paymentValidator = paymentValidator;
        _notificationService = notificationService;
    }

    public async Task<LendingSummaryResponse> GetLendingSummaryAsync(
        Guid? accountId = null,
        LendingStatus? status = null,
        CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();

        var query = _dbContext.LendingRecords
            .Include(r => r.Payments)
            .AsNoTracking()
            .Where(r => r.UserId == userId);

        if (accountId.HasValue)
        {
            query = query.Where(r => r.AccountId == accountId.Value);
        }

        if (status.HasValue)
        {
            query = query.Where(r => r.Status == status.Value);
        }

        var records = await query
            .OrderByDescending(r => r.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        var accountNames = await _dbContext.Accounts
            .AsNoTracking()
            .Where(a => a.UserId == userId)
            .ToDictionaryAsync(a => a.Id, a => a.Name, cancellationToken);

        var activeLent = records.Where(r => r.Type == LendingType.Lent && r.Status == LendingStatus.Active).ToList();
        var activeBorrowed = records.Where(r => r.Type == LendingType.Borrowed && r.Status == LendingStatus.Active).ToList();

        var totalLentRemaining = activeLent.Sum(r => r.RemainingAmount);
        var totalBorrowedRemaining = activeBorrowed.Sum(r => r.RemainingAmount);
        var netPosition = totalLentRemaining - totalBorrowedRemaining;

        var currencyCode = records.FirstOrDefault()?.CurrencyCode
            ?? (accountId.HasValue
                ? (await _dbContext.Accounts.Where(a => a.Id == accountId.Value).Select(a => a.CurrencyCode).FirstOrDefaultAsync(cancellationToken) ?? "USD")
                : "USD");

        var recordResponses = records.Select(r =>
        {
            var repaidAmount = r.OriginalAmount - r.RemainingAmount;
            var progressPercent = r.OriginalAmount > 0m
                ? Math.Min(100m, Math.Round((repaidAmount / r.OriginalAmount) * 100m, 1))
                : 0m;

            return new LendingRecordResponse(
                r.Id,
                r.AccountId,
                accountNames.TryGetValue(r.AccountId, out var name) ? name : "Unknown Account",
                r.Type,
                r.Type.ToString(),
                r.Counterparty,
                r.OriginalAmount,
                r.RemainingAmount,
                repaidAmount,
                progressPercent,
                r.CurrencyCode,
                r.DueDate,
                r.Notes,
                r.Status,
                r.Status.ToString(),
                r.CreatedAtUtc,
                r.Payments.OrderByDescending(p => p.OccurredOn).Select(p => new LendingPaymentResponse(
                    p.Id,
                    p.LendingRecordId,
                    p.Amount,
                    p.CurrencyCode,
                    p.OccurredOn,
                    p.Notes,
                    p.CreatedAtUtc
                )).ToList()
            );
        }).ToList();

        return new LendingSummaryResponse(
            totalLentRemaining,
            totalBorrowedRemaining,
            netPosition,
            currencyCode,
            activeLent.Count,
            activeBorrowed.Count,
            recordResponses
        );
    }

    public async Task<LendingRecordResponse> CreateRecordAsync(
        CreateLendingRecordCommand command,
        CancellationToken cancellationToken = default)
    {
        await _createValidator.ValidateAndThrowAsync(command, cancellationToken);

        var userId = _currentUser.GetRequiredUserId();

        var account = await _dbContext.Accounts
            .FirstOrDefaultAsync(a => a.Id == command.AccountId && a.UserId == userId, cancellationToken)
            ?? throw new NotFoundException("Account", command.AccountId);

        var record = new LendingRecord(
            userId,
            account.Id,
            command.Type,
            command.Counterparty,
            command.Amount,
            account.CurrencyCode,
            command.DueDate,
            command.Notes
        );

        await _dbContext.ExecuteInTransactionAsync(async ct =>
        {
            await _dbContext.LendingRecords.AddAsync(record, ct);

            if (command.SyncAccountBalance)
            {
                var today = DateOnly.FromDateTime(DateTime.UtcNow);
                var txType = record.Type == LendingType.Lent ? TransactionType.Expense : TransactionType.Income;
                var desc = record.Type == LendingType.Lent
                    ? $"[IOU Lent] To {record.Counterparty}"
                    : $"[IOU Borrowed] From {record.Counterparty}";

                var tx = FinancialTransaction.CreateAndApply(
                    userId,
                    account,
                    null,
                    null,
                    txType,
                    record.OriginalAmount,
                    today,
                    desc,
                    record.Notes
                );
                await _dbContext.Transactions.AddAsync(tx, ct);
            }

            await _dbContext.SaveChangesAsync(ct);

            if (_notificationService != null)
            {
                var action = record.Type == LendingType.Lent ? "lent to" : "borrowed from";
                await _notificationService.SendAsync(
                    userId,
                    "New IOU Recorded",
                    $"Recorded {record.OriginalAmount:N2} {record.CurrencyCode} {action} {record.Counterparty}.",
                    NotificationType.LendingReminder,
                    actionUrl: "/lending",
                    cancellationToken: ct);
            }
        }, cancellationToken);

        return new LendingRecordResponse(
            record.Id,
            record.AccountId,
            account.Name,
            record.Type,
            record.Type.ToString(),
            record.Counterparty,
            record.OriginalAmount,
            record.RemainingAmount,
            0m,
            0m,
            record.CurrencyCode,
            record.DueDate,
            record.Notes,
            record.Status,
            record.Status.ToString(),
            record.CreatedAtUtc,
            []
        );
    }

    public async Task<LendingPaymentResponse> RecordPaymentAsync(
        RecordLendingPaymentCommand command,
        CancellationToken cancellationToken = default)
    {
        await _paymentValidator.ValidateAndThrowAsync(command, cancellationToken);

        var userId = _currentUser.GetRequiredUserId();

        var record = await _dbContext.LendingRecords
            .Include(r => r.Payments)
            .FirstOrDefaultAsync(r => r.Id == command.LendingRecordId && r.UserId == userId, cancellationToken)
            ?? throw new NotFoundException("LendingRecord", command.LendingRecordId);

        var account = await _dbContext.Accounts
            .FirstOrDefaultAsync(a => a.Id == record.AccountId && a.UserId == userId, cancellationToken)
            ?? throw new NotFoundException("Account", record.AccountId);

        LendingPayment? payment = null;

        await _dbContext.ExecuteInTransactionAsync(async ct =>
        {
            payment = record.RecordPayment(command.Amount, command.OccurredOn, command.Notes);

            if (command.SyncAccountBalance)
            {
                var txType = record.Type == LendingType.Lent ? TransactionType.Income : TransactionType.Expense;
                var desc = record.Type == LendingType.Lent
                    ? $"[IOU Repayment] From {record.Counterparty}"
                    : $"[IOU Repayment] To {record.Counterparty}";

                var tx = FinancialTransaction.CreateAndApply(
                    userId,
                    account,
                    null,
                    null,
                    txType,
                    payment.Amount,
                    command.OccurredOn,
                    desc,
                    command.Notes
                );
                await _dbContext.Transactions.AddAsync(tx, ct);
            }

            await _dbContext.SaveChangesAsync(ct);

            if (_notificationService != null && payment != null)
            {
                if (record.Status == LendingStatus.Settled)
                {
                    await _notificationService.SendAsync(
                        userId,
                        "IOU Settled! 🤝",
                        $"The loan with {record.Counterparty} has been completely settled ({record.OriginalAmount:N2} {record.CurrencyCode}).",
                        NotificationType.LendingReminder,
                        actionUrl: "/lending",
                        cancellationToken: ct);
                }
                else
                {
                    await _notificationService.SendAsync(
                        userId,
                        "IOU Payment Logged",
                        $"Recorded repayment of {payment.Amount:N2} {record.CurrencyCode} for {record.Counterparty}. Remaining balance: {record.RemainingAmount:N2} {record.CurrencyCode}.",
                        NotificationType.LendingReminder,
                        actionUrl: "/lending",
                        cancellationToken: ct);
                }
            }
        }, cancellationToken);

        return new LendingPaymentResponse(
            payment!.Id,
            payment.LendingRecordId,
            payment.Amount,
            payment.CurrencyCode,
            payment.OccurredOn,
            payment.Notes,
            payment.CreatedAtUtc
        );
    }

    public async Task DeleteRecordAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var userId = _currentUser.GetRequiredUserId();

        var record = await _dbContext.LendingRecords
            .FirstOrDefaultAsync(r => r.Id == id && r.UserId == userId, cancellationToken)
            ?? throw new NotFoundException("LendingRecord", id);

        _dbContext.LendingRecords.Remove(record);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
