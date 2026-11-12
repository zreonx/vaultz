using Microsoft.EntityFrameworkCore;
using Vaultz.Application.Common.Interfaces;
using Vaultz.Domain.Common;
using Vaultz.Domain.Entities;

namespace Vaultz.Infrastructure.Persistence;

/// <summary>
/// Primary EF Core DbContext for the Vaultz modular monolith.
/// Configured for PostgreSQL with explicit numeric(19,4) conventions for decimal properties.
/// </summary>
public sealed class VaultzDbContext : DbContext, IVaultzDbContext
{
    public VaultzDbContext(DbContextOptions<VaultzDbContext> options)
        : base(options)
    {
    }

    public DbSet<UserAccount> Users => Set<UserAccount>();
    public DbSet<FinancialAccount> Accounts => Set<FinancialAccount>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<FinancialTransaction> Transactions => Set<FinancialTransaction>();
    public DbSet<Budget> Budgets => Set<Budget>();
    public DbSet<SavingsGoal> SavingsGoals => Set<SavingsGoal>();
    public DbSet<RecurringTransaction> RecurringTransactions => Set<RecurringTransaction>();
    public DbSet<LendingRecord> LendingRecords => Set<LendingRecord>();
    public DbSet<LendingPayment> LendingPayments => Set<LendingPayment>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<AccountAllocation> AccountAllocations => Set<AccountAllocation>();
    public DbSet<MonthlyBudgetPlan> MonthlyBudgetPlans => Set<MonthlyBudgetPlan>();
    public DbSet<MonthlyBudgetSlice> MonthlyBudgetSlices => Set<MonthlyBudgetSlice>();

    public async Task<bool> CanConnectAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            return await Database.CanConnectAsync(cancellationToken);
        }
        catch
        {
            return false;
        }
    }

    public async Task ExecuteInTransactionAsync(
        Func<CancellationToken, Task> operation,
        CancellationToken cancellationToken = default)
    {
        if (!Database.IsRelational())
        {
            await operation(cancellationToken);
            return;
        }

        await using var transaction = await Database.BeginTransactionAsync(cancellationToken);
        try
        {
            await operation(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        foreach (var entry in ChangeTracker.Entries<AuditableEntity>())
        {
            if (entry.State == EntityState.Modified)
            {
                entry.Property(nameof(AuditableEntity.UpdatedAtUtc)).CurrentValue = DateTimeOffset.UtcNow;
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }

    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        base.ConfigureConventions(configurationBuilder);

        // Enforce PostgreSQL numeric(19,4) precision by default for all decimal properties
        configurationBuilder
            .Properties<decimal>()
            .HavePrecision(19, 4);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(VaultzDbContext).Assembly);
    }
}
