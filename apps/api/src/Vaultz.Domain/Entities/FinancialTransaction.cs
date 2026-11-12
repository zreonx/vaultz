using Vaultz.Domain.Common;
using Vaultz.Domain.Enums;
using Vaultz.Domain.ValueObjects;

namespace Vaultz.Domain.Entities;

/// <summary>
/// Represents an Income, Expense, or Account-to-Account Transfer transaction (supporting both same-currency and cross-currency transfers).
/// Enforces single balance update semantics and strict separation between transfers and cash-flow income/expenses.
/// </summary>
public sealed class FinancialTransaction : UserOwnedEntity
{
    public Guid AccountId { get; private set; }
    public Guid? DestinationAccountId { get; private set; }
    public Guid? CategoryId { get; private set; }
    public TransactionType Type { get; private set; }
    public decimal Amount { get; private set; }
    public string CurrencyCode { get; private set; } = string.Empty;
    public decimal? DestinationAmount { get; private set; }
    public string? DestinationCurrencyCode { get; private set; }
    public decimal? ExchangeRate { get; private set; }
    public DateOnly OccurredOn { get; private set; }
    public string Description { get; private set; } = string.Empty;
    public string? Notes { get; private set; }
    public Guid? BudgetSliceId { get; private set; }
    public Guid? AccountAllocationId { get; private set; }

    private FinancialTransaction()
    {
    }

    private FinancialTransaction(
        string userId,
        Guid accountId,
        Guid? destinationAccountId,
        Guid? categoryId,
        TransactionType type,
        decimal amount,
        string currencyCode,
        decimal? destinationAmount,
        string? destinationCurrencyCode,
        decimal? exchangeRate,
        DateOnly occurredOn,
        string description,
        string? notes)
        : base(userId)
    {
        ValidateCoreInvariants(accountId, destinationAccountId, categoryId, type, amount, currencyCode, description);

        AccountId = accountId;
        DestinationAccountId = destinationAccountId;
        CategoryId = type == TransactionType.Transfer ? null : categoryId;
        Type = type;
        CurrencyCode = ValueObjects.CurrencyCode.From(currencyCode).Value;
        Amount = Money.Create(amount, CurrencyCode).Amount;
        DestinationAmount = destinationAmount.HasValue && destinationCurrencyCode is not null
            ? Money.Create(destinationAmount.Value, destinationCurrencyCode).Amount
            : null;
        DestinationCurrencyCode = destinationCurrencyCode is not null
            ? ValueObjects.CurrencyCode.From(destinationCurrencyCode).Value
            : null;
        ExchangeRate = exchangeRate;
        OccurredOn = occurredOn;
        Description = description.Trim();
        Notes = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim();
    }

    /// <summary>
    /// Creates a new transaction and applies its monetary impact to the affected account(s) exactly once.
    /// Supports both same-currency and cross-currency transfers.
    /// </summary>
    public static FinancialTransaction CreateAndApply(
        string userId,
        FinancialAccount sourceAccount,
        FinancialAccount? destinationAccount,
        Guid? categoryId,
        TransactionType type,
        decimal amount,
        DateOnly occurredOn,
        string description,
        string? notes = null,
        decimal? destinationAmount = null,
        Guid? budgetSliceId = null,
        Guid? accountAllocationId = null)
    {
        EnsureOwnership(userId, sourceAccount, destinationAccount);

        var (resolvedDestAmount, resolvedDestCurrency, resolvedRate) = ResolveTransferConversion(
            type,
            amount,
            sourceAccount,
            destinationAccount,
            destinationAmount);

        var transaction = new FinancialTransaction(
            userId,
            sourceAccount.Id,
            destinationAccount?.Id,
            categoryId,
            type,
            amount,
            sourceAccount.CurrencyCode,
            resolvedDestAmount,
            resolvedDestCurrency,
            resolvedRate,
            occurredOn,
            description,
            notes);

        if (budgetSliceId.HasValue)
        {
            transaction.BudgetSliceId = budgetSliceId.Value;
        }

        if (accountAllocationId.HasValue)
        {
            transaction.AccountAllocationId = accountAllocationId.Value;
        }

        transaction.ApplyBalanceImpact(sourceAccount, destinationAccount);
        return transaction;
    }

    public void AssignBudgetSlice(Guid budgetSliceId)
    {
        BudgetSliceId = budgetSliceId;
    }

    public void AssignAccountAllocation(Guid accountAllocationId)
    {
        AccountAllocationId = accountAllocationId;
    }

    /// <summary>
    /// Reverses the balance impact of this transaction from its associated account(s) before deletion or mutation.
    /// </summary>
    public void ReverseBalanceImpact(FinancialAccount sourceAccount, FinancialAccount? destinationAccount)
    {
        EnsureMatchingAccounts(sourceAccount, destinationAccount);

        switch (Type)
        {
            case TransactionType.Income:
                sourceAccount.Debit(Amount, CurrencyCode);
                break;

            case TransactionType.Expense:
                sourceAccount.Credit(Amount, CurrencyCode);
                break;

            case TransactionType.Transfer:
                if (destinationAccount is null)
                {
                    throw new DomainException("Destination account is required to reverse a transfer.", "missing_destination_account");
                }
                sourceAccount.Credit(Amount, CurrencyCode);
                var creditCurrency = DestinationCurrencyCode ?? destinationAccount.CurrencyCode;
                var creditAmount = DestinationAmount ?? Amount;
                destinationAccount.Debit(creditAmount, creditCurrency);
                break;
        }
    }

    /// <summary>
    /// Updates a transaction by first reversing its prior balance impact and then applying the updated values.
    /// </summary>
    public void UpdateAndReconcile(
        FinancialAccount previousSourceAccount,
        FinancialAccount? previousDestinationAccount,
        FinancialAccount newSourceAccount,
        FinancialAccount? newDestinationAccount,
        Guid? newCategoryId,
        TransactionType newType,
        decimal newAmount,
        DateOnly newOccurredOn,
        string newDescription,
        string? newNotes,
        decimal? newDestinationAmount = null)
    {
        EnsureOwnership(UserId, newSourceAccount, newDestinationAccount);
        ValidateCoreInvariants(
            newSourceAccount.Id,
            newDestinationAccount?.Id,
            newCategoryId,
            newType,
            newAmount,
            newSourceAccount.CurrencyCode,
            newDescription);

        // Step 1: Reverse old balance impact
        ReverseBalanceImpact(previousSourceAccount, previousDestinationAccount);

        // Step 2: Update state
        var (resolvedDestAmount, resolvedDestCurrency, resolvedRate) = ResolveTransferConversion(
            newType,
            newAmount,
            newSourceAccount,
            newDestinationAccount,
            newDestinationAmount);

        AccountId = newSourceAccount.Id;
        DestinationAccountId = newDestinationAccount?.Id;
        CategoryId = newType == TransactionType.Transfer ? null : newCategoryId;
        Type = newType;
        CurrencyCode = newSourceAccount.CurrencyCode;
        Amount = Money.Create(newAmount, CurrencyCode).Amount;
        DestinationAmount = resolvedDestAmount;
        DestinationCurrencyCode = resolvedDestCurrency;
        ExchangeRate = resolvedRate;
        OccurredOn = newOccurredOn;
        Description = newDescription.Trim();
        Notes = string.IsNullOrWhiteSpace(newNotes) ? null : newNotes.Trim();
        MarkUpdated(DateTimeOffset.UtcNow);

        // Step 3: Apply new balance impact
        ApplyBalanceImpact(newSourceAccount, newDestinationAccount);
    }

    public void AssignBudgetSlice(Guid? sliceId)
    {
        BudgetSliceId = sliceId;
        MarkUpdated(DateTimeOffset.UtcNow);
    }

    public void AssignAccountAllocation(Guid? allocationId)
    {
        AccountAllocationId = allocationId;
        MarkUpdated(DateTimeOffset.UtcNow);
    }

    private void ApplyBalanceImpact(FinancialAccount sourceAccount, FinancialAccount? destinationAccount)
    {
        EnsureMatchingAccounts(sourceAccount, destinationAccount);

        switch (Type)
        {
            case TransactionType.Income:
                sourceAccount.Credit(Amount, CurrencyCode);
                break;

            case TransactionType.Expense:
                sourceAccount.Debit(Amount, CurrencyCode);
                break;

            case TransactionType.Transfer:
                if (destinationAccount is null)
                {
                    throw new DomainException("Transfers require a destination account.", "missing_destination_account");
                }
                sourceAccount.Debit(Amount, CurrencyCode);
                var destCurrency = DestinationCurrencyCode ?? destinationAccount.CurrencyCode;
                var destAmount = DestinationAmount ?? Amount;
                destinationAccount.Credit(destAmount, destCurrency);
                break;
        }
    }

    private static (decimal? DestAmount, string? DestCurrency, decimal? ExchangeRate) ResolveTransferConversion(
        TransactionType type,
        decimal sourceAmount,
        FinancialAccount sourceAccount,
        FinancialAccount? destinationAccount,
        decimal? explicitDestinationAmount)
    {
        if (type != TransactionType.Transfer || destinationAccount is null)
        {
            return (null, null, null);
        }

        var sourceCurrency = sourceAccount.CurrencyCode;
        var destCurrency = destinationAccount.CurrencyCode;

        if (string.Equals(sourceCurrency, destCurrency, StringComparison.OrdinalIgnoreCase))
        {
            var normalized = Money.Create(sourceAmount, sourceCurrency).Amount;
            return (normalized, destCurrency, 1.000000m);
        }

        // Cross-currency transfer: use explicit destination amount if provided (> 0), otherwise reference catalog rate
        decimal resolvedDestAmount;
        if (explicitDestinationAmount.HasValue && explicitDestinationAmount.Value > 0m)
        {
            resolvedDestAmount = Money.Create(explicitDestinationAmount.Value, destCurrency).Amount;
        }
        else
        {
            resolvedDestAmount = ExchangeRateCatalog.Convert(sourceAmount, sourceCurrency, destCurrency);
        }

        if (resolvedDestAmount <= 0m)
        {
            throw new DomainException("Converted destination amount must be greater than zero.", "invalid_destination_amount");
        }

        var rate = decimal.Round(resolvedDestAmount / sourceAmount, 6, MidpointRounding.ToEven);
        return (resolvedDestAmount, destCurrency, rate);
    }

    private void EnsureMatchingAccounts(FinancialAccount sourceAccount, FinancialAccount? destinationAccount)
    {
        if (sourceAccount.Id != AccountId)
        {
            throw new DomainException("Source account does not match the transaction's account.", "account_mismatch");
        }

        if (Type == TransactionType.Transfer && destinationAccount?.Id != DestinationAccountId)
        {
            throw new DomainException("Destination account does not match the transfer's destination account.", "account_mismatch");
        }
    }

    private static void EnsureOwnership(string userId, FinancialAccount sourceAccount, FinancialAccount? destinationAccount)
    {
        if (!string.Equals(sourceAccount.UserId, userId, StringComparison.Ordinal))
        {
            throw new DomainException("Source account does not belong to the authenticated user.", "unauthorized_account_access");
        }

        if (destinationAccount is not null && !string.Equals(destinationAccount.UserId, userId, StringComparison.Ordinal))
        {
            throw new DomainException("Destination account does not belong to the authenticated user.", "unauthorized_account_access");
        }
    }

    private static void ValidateCoreInvariants(
        Guid accountId,
        Guid? destinationAccountId,
        Guid? categoryId,
        TransactionType type,
        decimal amount,
        string currencyCode,
        string description)
    {
        if (accountId == Guid.Empty)
        {
            throw new DomainException("Source account is required.", "invalid_account");
        }

        if (amount <= 0m)
        {
            throw new DomainException("Transaction amount must be greater than zero.", "invalid_amount");
        }

        _ = ValueObjects.CurrencyCode.From(currencyCode);

        if (string.IsNullOrWhiteSpace(description) || description.Trim().Length > 200)
        {
            throw new DomainException("Transaction description is required and must be at most 200 characters.", "invalid_description");
        }

        if (type == TransactionType.Transfer)
        {
            if (!destinationAccountId.HasValue || destinationAccountId.Value == Guid.Empty)
            {
                throw new DomainException("Account-to-account transfers require a destination account.", "missing_destination_account");
            }

            if (destinationAccountId.Value == accountId)
            {
                throw new DomainException("Source and destination accounts must be different for a transfer.", "same_account_transfer");
            }

            if (categoryId.HasValue)
            {
                throw new DomainException("Transfers are neither income nor expense and cannot be assigned an income/expense category.", "transfer_category_not_allowed");
            }
        }
        else if (destinationAccountId.HasValue)
        {
            throw new DomainException("Only transfer transactions may specify a destination account.", "unexpected_destination_account");
        }
    }
}
