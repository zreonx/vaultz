using Vaultz.Domain.Common;
using Vaultz.Domain.Enums;
using Vaultz.Domain.ValueObjects;

namespace Vaultz.Domain.Entities;

/// <summary>
/// Scheduled template for recurring income, expense, or transfer transactions.
/// </summary>
public sealed class RecurringTransaction : UserOwnedEntity
{
    public Guid AccountId { get; private set; }
    public Guid? DestinationAccountId { get; private set; }
    public Guid? CategoryId { get; private set; }
    public TransactionType Type { get; private set; }
    public decimal Amount { get; private set; }
    public string CurrencyCode { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public RecurrenceFrequency Frequency { get; private set; }
    public DateOnly NextOccurrenceDate { get; private set; }
    public DateOnly? LastProcessedDate { get; private set; }
    public bool IsActive { get; private set; }

    private RecurringTransaction()
    {
    }

    public RecurringTransaction(
        string userId,
        Guid accountId,
        Guid? destinationAccountId,
        Guid? categoryId,
        TransactionType type,
        decimal amount,
        string currencyCode,
        string description,
        RecurrenceFrequency frequency,
        DateOnly nextOccurrenceDate)
        : base(userId)
    {
        if (accountId == Guid.Empty)
        {
            throw new DomainException("Source account is required.", "invalid_account");
        }

        if (amount <= 0m)
        {
            throw new DomainException("Recurring transaction amount must be greater than zero.", "invalid_amount");
        }

        if (string.IsNullOrWhiteSpace(description) || description.Trim().Length > 200)
        {
            throw new DomainException("Description is required and must be at most 200 characters.", "invalid_description");
        }

        if (type == TransactionType.Transfer)
        {
            if (!destinationAccountId.HasValue || destinationAccountId.Value == accountId)
            {
                throw new DomainException("Recurring transfers require a distinct destination account.", "invalid_transfer_destination");
            }
        }

        AccountId = accountId;
        DestinationAccountId = type == TransactionType.Transfer ? destinationAccountId : null;
        CategoryId = type == TransactionType.Transfer ? null : categoryId;
        Type = type;
        CurrencyCode = ValueObjects.CurrencyCode.From(currencyCode).Value;
        Amount = Money.Create(amount, CurrencyCode).Amount;
        Description = description.Trim();
        Frequency = frequency;
        NextOccurrenceDate = nextOccurrenceDate;
        IsActive = true;
    }

    public void AdvanceOccurrence(DateOnly processedDate)
    {
        LastProcessedDate = processedDate;
        NextOccurrenceDate = Frequency switch
        {
            RecurrenceFrequency.Daily => NextOccurrenceDate.AddDays(1),
            RecurrenceFrequency.Weekly => NextOccurrenceDate.AddDays(7),
            RecurrenceFrequency.Monthly => NextOccurrenceDate.AddMonths(1),
            RecurrenceFrequency.Yearly => NextOccurrenceDate.AddYears(1),
            _ => NextOccurrenceDate.AddMonths(1)
        };
        MarkUpdated(DateTimeOffset.UtcNow);
    }
}
