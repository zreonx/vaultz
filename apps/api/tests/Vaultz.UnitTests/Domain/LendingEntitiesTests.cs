using Vaultz.Domain.Common;
using Vaultz.Domain.Entities;
using Vaultz.Domain.Enums;

namespace Vaultz.UnitTests.Domain;

public sealed class LendingEntitiesTests
{
    [Fact]
    public void LendingRecord_Creation_InitializesActiveWithRemainingEqualOriginal()
    {
        var accountId = Guid.NewGuid();
        var record = new LendingRecord(
            "user-1",
            accountId,
            LendingType.Lent,
            "Alex",
            150.00m,
            "USD",
            new DateOnly(2026, 12, 1),
            "Dinner split"
        );

        Assert.Equal("Alex", record.Counterparty);
        Assert.Equal(150.00m, record.OriginalAmount);
        Assert.Equal(150.00m, record.RemainingAmount);
        Assert.Equal(LendingStatus.Active, record.Status);
        Assert.Equal("USD", record.CurrencyCode);
        Assert.Empty(record.Payments);
    }

    [Fact]
    public void LendingRecord_RecordPayment_DecreasesRemainingAmount()
    {
        var accountId = Guid.NewGuid();
        var record = new LendingRecord(
            "user-1",
            accountId,
            LendingType.Lent,
            "Alex",
            100.00m,
            "USD"
        );

        var payment = record.RecordPayment(40.00m, new DateOnly(2026, 11, 2), "First installment");

        Assert.Equal(60.00m, record.RemainingAmount);
        Assert.Equal(LendingStatus.Active, record.Status);
        Assert.Single(record.Payments);
        Assert.Equal(40.00m, payment.Amount);
    }

    [Fact]
    public void LendingRecord_FullPayment_TransitionsToSettled()
    {
        var accountId = Guid.NewGuid();
        var record = new LendingRecord(
            "user-1",
            accountId,
            LendingType.Borrowed,
            "Sarah",
            50.00m,
            "USD"
        );

        record.RecordPayment(50.00m, new DateOnly(2026, 11, 2), "Fully paid back");

        Assert.Equal(0m, record.RemainingAmount);
        Assert.Equal(LendingStatus.Settled, record.Status);
    }

    [Fact]
    public void LendingRecord_PaymentExceedingRemaining_ThrowsDomainException()
    {
        var accountId = Guid.NewGuid();
        var record = new LendingRecord(
            "user-1",
            accountId,
            LendingType.Lent,
            "Bob",
            30.00m,
            "USD"
        );

        var ex = Assert.Throws<DomainException>(() =>
            record.RecordPayment(35.00m, new DateOnly(2026, 11, 2)));

        Assert.Equal("payment_exceeds_remaining", ex.Code);
    }
}
