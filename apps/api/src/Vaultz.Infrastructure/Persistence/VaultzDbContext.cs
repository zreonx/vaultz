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
    public DbSet<QuickLogPreset> QuickLogPresets => Set<QuickLogPreset>();
    public DbSet<WishlistItem> WishlistItems => Set<WishlistItem>();
    public DbSet<QuickNote> QuickNotes => Set<QuickNote>();

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

        if (Database.CurrentTransaction is not null)
        {
            await operation(cancellationToken);
            return;
        }

        var strategy = Database.CreateExecutionStrategy();
        var attempt = 0;

        await strategy.ExecuteAsync(
            state: operation,
            operation: async (db, op, ct) =>
            {
                if (attempt++ > 0)
                {
                    db.ChangeTracker.Clear();
                }

                await using var transaction = await db.Database.BeginTransactionAsync(ct);
                try
                {
                    await op(ct);
                    await transaction.CommitAsync(ct);
                    return true;
                }
                catch
                {
                    try
                    {
                        await transaction.RollbackAsync(CancellationToken.None);
                    }
                    catch
                    {
                        // Connection may already be broken on a transient failure; preserve the original exception for retry/reporting.
                    }

                    throw;
                }
            },
            verifySucceeded: null,
            cancellationToken: cancellationToken);
    }

    public async Task DeleteAccountDependentRecordsAsync(
        string userId,
        Guid accountId,
        CancellationToken cancellationToken = default)
    {
        if (!Database.IsRelational())
        {
            var allocations = await AccountAllocations
                .Where(a => a.AccountId == accountId && a.UserId == userId)
                .ToListAsync(cancellationToken);
            AccountAllocations.RemoveRange(allocations);

            var budgetPlans = await MonthlyBudgetPlans
                .Include(p => p.Slices)
                .Where(p => p.AccountId == accountId && p.UserId == userId)
                .ToListAsync(cancellationToken);
            MonthlyBudgetPlans.RemoveRange(budgetPlans);

            var budgets = await Budgets
                .Where(b => b.AccountId == accountId && b.UserId == userId)
                .ToListAsync(cancellationToken);
            Budgets.RemoveRange(budgets);

            var scopedCategories = await Categories
                .Where(c => c.AccountId == accountId && c.UserId == userId)
                .ToListAsync(cancellationToken);
            Categories.RemoveRange(scopedCategories);

            var scopedGoals = await SavingsGoals
                .Where(s => s.AccountId == accountId && s.UserId == userId)
                .ToListAsync(cancellationToken);
            SavingsGoals.RemoveRange(scopedGoals);

            var recurrings = await RecurringTransactions
                .Where(r => (r.AccountId == accountId || r.DestinationAccountId == accountId) && r.UserId == userId)
                .ToListAsync(cancellationToken);
            RecurringTransactions.RemoveRange(recurrings);

            var lendings = await LendingRecords
                .Include(l => l.Payments)
                .Where(l => l.AccountId == accountId && l.UserId == userId)
                .ToListAsync(cancellationToken);
            LendingRecords.RemoveRange(lendings);

            var transactions = await Transactions
                .Where(t => (t.AccountId == accountId || t.DestinationAccountId == accountId) && t.UserId == userId)
                .ToListAsync(cancellationToken);
            Transactions.RemoveRange(transactions);

            var quickLogPresets = await QuickLogPresets
                .Where(q => q.AccountId == accountId && q.UserId == userId)
                .ToListAsync(cancellationToken);
            QuickLogPresets.RemoveRange(quickLogPresets);

            var wishlistItems = await WishlistItems
                .Where(w => w.AccountId == accountId && w.UserId == userId)
                .ToListAsync(cancellationToken);
            WishlistItems.RemoveRange(wishlistItems);

            var quickNotes = await QuickNotes
                .Where(n => n.AccountId == accountId && n.UserId == userId)
                .ToListAsync(cancellationToken);
            QuickNotes.RemoveRange(quickNotes);

            await SaveChangesAsync(cancellationToken);
            return;
        }

        // Delete strictly in child-to-parent order before removing the parent account row
        // so DB-level ON DELETE CASCADE constraints cannot trigger DbUpdateConcurrencyException.
        await MonthlyBudgetSlices
            .Where(s => s.UserId == userId &&
                MonthlyBudgetPlans.Any(p => p.Id == s.MonthlyBudgetPlanId && p.AccountId == accountId && p.UserId == userId))
            .ExecuteDeleteAsync(cancellationToken);

        await MonthlyBudgetPlans
            .Where(p => p.AccountId == accountId && p.UserId == userId)
            .ExecuteDeleteAsync(cancellationToken);

        await AccountAllocations
            .Where(a => a.AccountId == accountId && a.UserId == userId)
            .ExecuteDeleteAsync(cancellationToken);

        await QuickLogPresets
            .Where(q => q.AccountId == accountId && q.UserId == userId)
            .ExecuteDeleteAsync(cancellationToken);

        await Transactions
            .Where(t => (t.AccountId == accountId || t.DestinationAccountId == accountId) && t.UserId == userId)
            .ExecuteDeleteAsync(cancellationToken);

        await RecurringTransactions
            .Where(r => (r.AccountId == accountId || r.DestinationAccountId == accountId) && r.UserId == userId)
            .ExecuteDeleteAsync(cancellationToken);

        await LendingPayments
            .Where(lp => LendingRecords.Any(l => l.Id == lp.LendingRecordId && l.AccountId == accountId && l.UserId == userId))
            .ExecuteDeleteAsync(cancellationToken);

        await LendingRecords
            .Where(l => l.AccountId == accountId && l.UserId == userId)
            .ExecuteDeleteAsync(cancellationToken);

        await Budgets
            .Where(b => b.AccountId == accountId && b.UserId == userId)
            .ExecuteDeleteAsync(cancellationToken);

        await SavingsGoals
            .Where(s => s.AccountId == accountId && s.UserId == userId)
            .ExecuteDeleteAsync(cancellationToken);

        await Categories
            .Where(c => c.AccountId == accountId && c.UserId == userId)
            .ExecuteDeleteAsync(cancellationToken);

        await WishlistItems
            .Where(w => w.AccountId == accountId && w.UserId == userId)
            .ExecuteDeleteAsync(cancellationToken);

        await QuickNotes
            .Where(n => n.AccountId == accountId && n.UserId == userId)
            .ExecuteDeleteAsync(cancellationToken);
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
