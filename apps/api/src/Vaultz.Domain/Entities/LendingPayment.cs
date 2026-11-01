using Vaultz.Domain.Common;
using Vaultz.Domain.ValueObjects;

namespace Vaultz.Domain.Entities;

/// <summary>
/// Log of an individual payment or settlement towards an IOU/Lending record.
/// </summary>
public sealed class LendingPayment : AuditableEntity
{
    public Guid LendingRecordId { get; private set; }
    public decimal Amount { get; private set; }
    public string CurrencyCode { get; private set; } = string.Empty;
    public DateOnly OccurredOn { get; private set; }
    public string? Notes { get; private set; }

    private LendingPayment()
    {
    }

    public LendingPayment(Guid lendingRecordId, decimal amount, string currencyCode, DateOnly occurredOn, string? notes = null)
    {
        if (lendingRecordId == Guid.Empty)
        {
            throw new DomainException("A valid LendingRecordId is required.", "missing_lending_record_id");
        }

        if (amount <= 0m)
        {
            throw new DomainException("Payment amount must be greater than zero.", "invalid_payment_amount");
        }

        LendingRecordId = lendingRecordId;
        CurrencyCode = ValueObjects.CurrencyCode.From(currencyCode).Value;
        Amount = Money.Create(amount, CurrencyCode).Amount;
        OccurredOn = occurredOn;
        Notes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim();
    }
}
