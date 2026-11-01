using Vaultz.Domain.Common;
using Vaultz.Domain.ValueObjects;

namespace Vaultz.UnitTests.Domain;

public sealed class MoneyAndCurrencyTests
{
    private sealed class TestUserEntity : UserOwnedEntity
    {
        public TestUserEntity(string userId) : base(userId)
        {
        }
    }

    [Theory]
    [InlineData("usd", "USD")]
    [InlineData(" EUR ", "EUR")]
    [InlineData("php", "PHP")]
    public void CurrencyCode_ValidThreeLetterCode_NormalizesToUpper(string input, string expected)
    {
        var code = CurrencyCode.From(input);

        Assert.Equal(expected, code.Value);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("US")]
    [InlineData("USDT")]
    [InlineData("12A")]
    public void CurrencyCode_InvalidCode_ThrowsDomainException(string invalidCode)
    {
        var exception = Assert.Throws<DomainException>(() => CurrencyCode.From(invalidCode));

        Assert.Equal("invalid_currency_code", exception.Code);
    }

    [Fact]
    public void Money_SameCurrencyAdditionAndSubtraction_PreservesDecimalPrecision()
    {
        var first = Money.Create(1250.5525m, "USD");
        var second = Money.Create(49.4475m, "USD");

        var sum = first.Add(second);
        var diff = first.Subtract(second);

        Assert.Equal(1300.0000m, sum.Amount);
        Assert.Equal("USD", sum.Currency.Value);
        Assert.Equal(1201.1050m, diff.Amount);
    }

    [Fact]
    public void Money_DifferentCurrencies_ThrowsCurrencyMismatchDomainException()
    {
        var usd = Money.Create(100.00m, "USD");
        var eur = Money.Create(100.00m, "EUR");

        var exception = Assert.Throws<DomainException>(() => usd.Add(eur));

        Assert.Equal("currency_mismatch", exception.Code);
    }

    [Fact]
    public void Money_RoundToMinorUnits_UsesBankersRounding()
    {
        var amount = Money.Create(10.125m, "USD");

        var rounded = amount.RoundToMinorUnits(2);

        Assert.Equal(10.12m, rounded.Amount);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void UserOwnedEntity_MissingUserId_ThrowsDomainException(string invalidUserId)
    {
        var exception = Assert.Throws<DomainException>(() => new TestUserEntity(invalidUserId));

        Assert.Equal("missing_user_id", exception.Code);
    }
}
