using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Vaultz.Domain.Common;
using Vaultz.Domain.Entities;
using Vaultz.Domain.Enums;
using Vaultz.Infrastructure.Persistence;

namespace Vaultz.UnitTests.Infrastructure;

public sealed class VaultzDbContextTransactionTests
{
    private static (VaultzDbContext DbContext, FakeTransactionManager TransactionManager) CreateRetryingDbContext()
    {
        var options = new DbContextOptionsBuilder<VaultzDbContext>()
            .UseNpgsql(
                "Host=localhost;Port=5432;Database=vaultz_unit_test;Username=u;Password=p",
                npgsql => npgsql.EnableRetryOnFailure(
                    maxRetryCount: 3,
                    maxRetryDelay: TimeSpan.FromMilliseconds(10),
                    errorCodesToAdd: null))
            .ReplaceService<IDbContextTransactionManager, FakeTransactionManager>()
            .Options;

        // Wait: ReplaceService<TService, TImplementation> instantiates via DI; we need the singleton instance or resolve it from context.
        var dbContext = new VaultzDbContext(options);
        var resolvedManager = (FakeTransactionManager)((Microsoft.EntityFrameworkCore.Infrastructure.IInfrastructure<IServiceProvider>)dbContext)
            .Instance
            .GetService(typeof(IDbContextTransactionManager))!;

        return (dbContext, resolvedManager);
    }

    [Fact]
    public async Task ExecuteInTransactionAsync_WithRetryingExecutionStrategy_ExecutesInsideStrategyWithoutThrowing()
    {
        var (dbContext, txManager) = CreateRetryingDbContext();
        await using (dbContext)
        {
            await dbContext.ExecuteInTransactionAsync(ct =>
            {
                dbContext.Database.CreateExecutionStrategy().Execute(() => true);
                return Task.CompletedTask;
            });

            Assert.Equal(1, txManager.BeginCount);
            Assert.Equal(1, txManager.CommitCount);
            Assert.Equal(0, txManager.RollbackCount);
        }
    }

    [Fact]
    public async Task ExecuteInTransactionAsync_WhenTransientFailureOccurs_RetriesClearsTrackerAndCommits()
    {
        var (dbContext, txManager) = CreateRetryingDbContext();
        await using (dbContext)
        {
            var attempts = 0;

            await dbContext.ExecuteInTransactionAsync(ct =>
            {
                attempts++;
                if (attempts == 1)
                {
                    dbContext.Accounts.Add(new FinancialAccount("user-1", "Temp", AccountType.Checking, "USD", 10m));
                    throw new TimeoutException("Transient failure");
                }

                Assert.Empty(dbContext.ChangeTracker.Entries());
                return Task.CompletedTask;
            });

            Assert.Equal(2, attempts);
            Assert.Equal(2, txManager.BeginCount);
            Assert.Equal(1, txManager.RollbackCount);
            Assert.Equal(1, txManager.CommitCount);
        }
    }

    [Fact]
    public async Task ExecuteInTransactionAsync_WhenDomainExceptionThrown_RollsBackWithoutRetrying()
    {
        var (dbContext, txManager) = CreateRetryingDbContext();
        await using (dbContext)
        {
            await Assert.ThrowsAsync<DomainException>(() =>
                dbContext.ExecuteInTransactionAsync(_ =>
                    throw new DomainException("test", "test_code")));

            Assert.Equal(1, txManager.BeginCount);
            Assert.Equal(1, txManager.RollbackCount);
            Assert.Equal(0, txManager.CommitCount);
        }
    }

    [Fact]
    public async Task ExecuteInTransactionAsync_WhenTransactionAlreadyActive_ReusesAmbientTransaction()
    {
        var (dbContext, txManager) = CreateRetryingDbContext();
        await using (dbContext)
        {
            await dbContext.ExecuteInTransactionAsync(async ct =>
            {
                await dbContext.ExecuteInTransactionAsync(_ => Task.CompletedTask, ct);
            });

            Assert.Equal(1, txManager.BeginCount);
            Assert.Equal(1, txManager.CommitCount);
            Assert.Equal(0, txManager.RollbackCount);
        }
    }

    private sealed class FakeTransactionManager : IDbContextTransactionManager, ITransactionEnlistmentManager
    {
        private FakeDbContextTransaction? _currentTransaction;

        public int BeginCount { get; private set; }
        public int CommitCount { get; private set; }
        public int RollbackCount { get; private set; }

        public IDbContextTransaction? CurrentTransaction => _currentTransaction;
        public System.Transactions.Transaction? CurrentAmbientTransaction => System.Transactions.Transaction.Current;
        public System.Transactions.Transaction? EnlistedTransaction { get; private set; }

        public void EnlistTransaction(System.Transactions.Transaction? transaction)
        {
            EnlistedTransaction = transaction;
        }

        public IDbContextTransaction BeginTransaction()
        {
            BeginCount++;
            _currentTransaction = new FakeDbContextTransaction(this);
            return _currentTransaction;
        }

        public Task<IDbContextTransaction> BeginTransactionAsync(CancellationToken cancellationToken = default)
        {
            return Task.FromResult(BeginTransaction());
        }

        public void CommitTransaction()
        {
            if (_currentTransaction is not null)
            {
                _currentTransaction.Commit();
            }
        }

        public Task CommitTransactionAsync(CancellationToken cancellationToken = default)
        {
            CommitTransaction();
            return Task.CompletedTask;
        }

        public void RollbackTransaction()
        {
            if (_currentTransaction is not null)
            {
                _currentTransaction.Rollback();
            }
        }

        public Task RollbackTransactionAsync(CancellationToken cancellationToken = default)
        {
            RollbackTransaction();
            return Task.CompletedTask;
        }

        public void ResetState()
        {
            _currentTransaction = null;
        }

        public Task ResetStateAsync(CancellationToken cancellationToken = default)
        {
            ResetState();
            return Task.CompletedTask;
        }

        internal void OnCommit(FakeDbContextTransaction tx)
        {
            CommitCount++;
            if (ReferenceEquals(_currentTransaction, tx))
            {
                _currentTransaction = null;
            }
        }

        internal void OnRollback(FakeDbContextTransaction tx)
        {
            RollbackCount++;
            if (ReferenceEquals(_currentTransaction, tx))
            {
                _currentTransaction = null;
            }
        }

        internal void OnDispose(FakeDbContextTransaction tx)
        {
            if (ReferenceEquals(_currentTransaction, tx))
            {
                _currentTransaction = null;
            }
        }
    }

    private sealed class FakeDbContextTransaction : IDbContextTransaction
    {
        private readonly FakeTransactionManager _manager;

        public FakeDbContextTransaction(FakeTransactionManager manager)
        {
            _manager = manager;
        }

        public Guid TransactionId { get; } = Guid.NewGuid();

        public void Commit() => _manager.OnCommit(this);

        public Task CommitAsync(CancellationToken cancellationToken = default)
        {
            Commit();
            return Task.CompletedTask;
        }

        public void Rollback() => _manager.OnRollback(this);

        public Task RollbackAsync(CancellationToken cancellationToken = default)
        {
            Rollback();
            return Task.CompletedTask;
        }

        public void Dispose() => _manager.OnDispose(this);

        public ValueTask DisposeAsync()
        {
            Dispose();
            return ValueTask.CompletedTask;
        }
    }
}
