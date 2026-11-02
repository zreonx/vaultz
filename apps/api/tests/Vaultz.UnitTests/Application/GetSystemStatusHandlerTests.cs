using Microsoft.EntityFrameworkCore;
using Vaultz.Application.Common.Interfaces;
using Vaultz.Application.Features.System.GetSystemStatus;
using Vaultz.Domain.Entities;

namespace Vaultz.UnitTests.Application;

public sealed class GetSystemStatusHandlerTests
{
    private sealed class FakeVaultzDbContext : IVaultzDbContext
    {
        private readonly bool _canConnect;
        public int CanConnectCallCount { get; private set; }

        public FakeVaultzDbContext(bool canConnect = true)
        {
            _canConnect = canConnect;
        }

        public DbSet<UserAccount> Users => throw new NotImplementedException();
        public DbSet<FinancialAccount> Accounts => throw new NotImplementedException();
        public DbSet<Category> Categories => throw new NotImplementedException();
        public DbSet<FinancialTransaction> Transactions => throw new NotImplementedException();
        public DbSet<Budget> Budgets => throw new NotImplementedException();
        public DbSet<SavingsGoal> SavingsGoals => throw new NotImplementedException();
        public DbSet<RecurringTransaction> RecurringTransactions => throw new NotImplementedException();
        public DbSet<LendingRecord> LendingRecords => throw new NotImplementedException();
        public DbSet<LendingPayment> LendingPayments => throw new NotImplementedException();
        public DbSet<Notification> Notifications => throw new NotImplementedException();

        public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) =>
            Task.FromResult(0);

        public Task<bool> CanConnectAsync(CancellationToken cancellationToken = default)
        {
            CanConnectCallCount++;
            return Task.FromResult(_canConnect);
        }

        public Task ExecuteInTransactionAsync(
            Func<CancellationToken, Task> operation,
            CancellationToken cancellationToken = default) =>
            operation(cancellationToken);
    }

    [Fact]
    public async Task HandleAsync_WithoutDatabaseCheck_ReturnsConfiguredWithoutPingingDb()
    {
        var fakeDb = new FakeVaultzDbContext();
        var handler = new GetSystemStatusHandler(fakeDb);

        var result = await handler.HandleAsync(new GetSystemStatusQuery(CheckDatabase: false), "Development");

        Assert.Equal("Vaultz.Api", result.Service);
        Assert.Equal("Healthy", result.Status);
        Assert.Equal("0.1.0", result.Version);
        Assert.Equal("Development", result.Environment);
        Assert.Equal("Configured", result.DatabaseStatus);
        Assert.Equal(0, fakeDb.CanConnectCallCount);
    }

    [Fact]
    public async Task HandleAsync_WithDatabaseCheck_ReportsConnectedStatus()
    {
        var fakeDb = new FakeVaultzDbContext(canConnect: true);
        var handler = new GetSystemStatusHandler(fakeDb);

        var result = await handler.HandleAsync(new GetSystemStatusQuery(CheckDatabase: true), "Testing");

        Assert.Equal("Connected", result.DatabaseStatus);
        Assert.Equal(1, fakeDb.CanConnectCallCount);
    }
}
