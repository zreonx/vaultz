using Vaultz.Domain.Common;
using Vaultz.Domain.Enums;
using Vaultz.Domain.ValueObjects;

namespace Vaultz.Domain.Entities;

/// <summary>
/// Casual personal IOU / lending record (Lent or Borrowed), strictly tied to a user and an account.
/// </summary>
public sealed class LendingRecord : UserOwnedEntity
{
    public Guid AccountId { get; private set; }
    public LendingType Type { get; private set; }
    public string Counterparty { get; private set; } = string.Empty;
    public decimal OriginalAmount { get; private set; }
    public decimal RemainingAmount { get; private set; }
    public string CurrencyCode { get; private set; } = string.Empty;
    public DateOnly? DueDate { get; private set; }
    public string? Notes { get; private set; }
    public LendingStatus Status { get; private set; }

    private readonly List<LendingPayment> _payments = [];
    public IReadOnlyCollection<LendingPayment> Payments => _payments.AsReadOnly();

    private LendingRecord()
    {
    }

    public LendingRecord(
        string userId,
        Guid accountId,
        LendingType type,
        string counterparty,
        decimal originalAmount,
        string currencyCode,
        DateOnly? dueDate = null,
        string? notes = null)
        : base(userId)
    {
        if (accountId == Guid.Empty)
        {
            throw new DomainException("An account ID is required for a lending record.", "missing_account_id");
        }

        if (string.IsNullOrWhiteSpace(counterparty) || counterparty.Trim().Length > 100)
        {
            throw new DomainException("Counterparty name is required and must not exceed 100 characters.", "invalid_counterparty");
        }

        if (originalAmount <= 0m)
        {
            throw new DomainException("Amount must be greater than zero.", "invalid_amount");
        }

        AccountId = accountId;
        Type = type;
        Counterparty = counterparty.Trim();
        CurrencyCode = ValueObjects.CurrencyCode.From(currencyCode).Value;
        OriginalAmount = Money.Create(originalAmount, CurrencyCode).Amount;
        RemainingAmount = OriginalAmount;
        DueDate = dueDate;
        Notes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim();
        Status = LendingStatus.Active;
    }

    public LendingPayment RecordPayment(decimal paymentAmount, DateOnly occurredOn, string? notes = null)
    {
        if (Status != LendingStatus.Active)
        {
            throw new DomainException("Payments can only be recorded for active records.", "inactive_lending_record");
        }

        if (paymentAmount <= 0m)
        {
            throw new DomainException("Payment amount must be greater than zero.", "invalid_payment_amount");
        }

        var moneyPayment = Money.Create(paymentAmount, CurrencyCode).Amount;
        if (moneyPayment > RemainingAmount)
        {
            throw new DomainException("Payment amount cannot exceed the remaining balance.", "payment_exceeds_remaining");
        }

        RemainingAmount = Money.Create(RemainingAmount - moneyPayment, CurrencyCode).Amount;
        if (RemainingAmount == 0m)
        {
            Status = LendingStatus.Settled;
        }

        var payment = new LendingPayment(Id, moneyPayment, CurrencyCode, occurredOn, notes);
        _payments.Add(payment);
        MarkUpdated(DateTimeOffset.UtcNow);
        return payment;
    }

    public void MarkSettled()
    {
        RemainingAmount = 0m;
        Status = LendingStatus.Settled;
        MarkUpdated(DateTimeOffset.UtcNow);
    }

    public void MarkWrittenOff()
    {
        Status = LendingStatus.WrittenOff;
        MarkUpdated(DateTimeOffset.UtcNow);
    }
}
