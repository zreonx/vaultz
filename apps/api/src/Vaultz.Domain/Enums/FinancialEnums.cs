namespace Vaultz.Domain.Enums;

public enum AccountType
{
    Checking = 1,
    Savings = 2,
    Cash = 3,
    CreditCard = 4,
    Investment = 5
}

public enum TransactionType
{
    Income = 1,
    Expense = 2,
    Transfer = 3
}

public enum CategoryType
{
    Income = 1,
    Expense = 2
}

public enum RecurrenceFrequency
{
    Daily = 1,
    Weekly = 2,
    Monthly = 3,
    Yearly = 4
}

public enum LendingType
{
    Lent = 1,
    Borrowed = 2
}

public enum LendingStatus
{
    Active = 1,
    Settled = 2,
    WrittenOff = 3
}

public enum AllocationCategory
{
    Emergency = 1,
    Savings = 2,
    Bills = 3,
    Custom = 4
}
