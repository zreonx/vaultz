using Microsoft.EntityFrameworkCore;
using Vaultz.Domain.Entities;

namespace Vaultz.Application.Common.Interfaces;

/// <summary>
/// Application-layer persistence abstraction implemented by VaultzDbContext in Infrastructure.
/// </summary>
public interface IVaultzDbContext
{
    DbSet<UserAccount> Users { get; }
    DbSet<FinancialAccount> Accounts { get; }
    DbSet<Category> Categories { get; }
    DbSet<FinancialTransaction> Transactions { get; }
    DbSet<Budget> Budgets { get; }
    DbSet<SavingsGoal> SavingsGoals { get; }
    DbSet<RecurringTransaction> RecurringTransactions { get; }
    DbSet<LendingRecord> LendingRecords { get; }
    DbSet<LendingPayment> LendingPayments { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    Task<bool> CanConnectAsync(CancellationToken cancellationToken = default);
    Task ExecuteInTransactionAsync(Func<CancellationToken, Task> operation, CancellationToken cancellationToken = default);
}
