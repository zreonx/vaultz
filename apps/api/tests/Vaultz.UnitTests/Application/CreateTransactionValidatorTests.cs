using FluentValidation.TestHelper;
using Vaultz.Application.Features.Transactions;
using Vaultz.Domain.Enums;
using Xunit;

namespace Vaultz.UnitTests.Application;

public sealed class CreateTransactionValidatorTests
{
    private readonly CreateTransactionValidator _validator = new();

    [Fact]
    public void Validate_WhenDescriptionIsNull_IsValid()
    {
        var command = new CreateTransactionCommand(
            AccountId: Guid.NewGuid(),
            DestinationAccountId: null,
            CategoryId: Guid.NewGuid(),
            Type: TransactionType.Expense,
            Amount: 50.00m,
            OccurredOn: new DateOnly(2026, 11, 12),
            Description: null);

        var result = _validator.TestValidate(command);

        result.ShouldNotHaveValidationErrorFor(x => x.Description);
        Assert.True(result.IsValid);
    }

    [Fact]
    public void Validate_WhenDescriptionIsEmpty_IsValid()
    {
        var command = new CreateTransactionCommand(
            AccountId: Guid.NewGuid(),
            DestinationAccountId: null,
            CategoryId: Guid.NewGuid(),
            Type: TransactionType.Expense,
            Amount: 25.50m,
            OccurredOn: new DateOnly(2026, 11, 12),
            Description: string.Empty);

        var result = _validator.TestValidate(command);

        result.ShouldNotHaveValidationErrorFor(x => x.Description);
        Assert.True(result.IsValid);
    }

    [Fact]
    public void Validate_WhenDescriptionExceeds200Characters_HasValidationError()
    {
        var command = new CreateTransactionCommand(
            AccountId: Guid.NewGuid(),
            DestinationAccountId: null,
            CategoryId: Guid.NewGuid(),
            Type: TransactionType.Expense,
            Amount: 100m,
            OccurredOn: new DateOnly(2026, 11, 12),
            Description: new string('a', 201));

        var result = _validator.TestValidate(command);

        result.ShouldHaveValidationErrorFor(x => x.Description);
    }

    [Fact]
    public void Validate_WhenTransferMissingDestinationAccount_HasValidationError()
    {
        var command = new CreateTransactionCommand(
            AccountId: Guid.NewGuid(),
            DestinationAccountId: null,
            CategoryId: null,
            Type: TransactionType.Transfer,
            Amount: 100m,
            OccurredOn: new DateOnly(2026, 11, 12),
            Description: null);

        var result = _validator.TestValidate(command);

        result.ShouldHaveValidationErrorFor(x => x.DestinationAccountId);
    }
}
