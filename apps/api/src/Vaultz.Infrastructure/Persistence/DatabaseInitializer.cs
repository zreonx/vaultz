using System.Data;
using System.Reflection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Vaultz.Infrastructure.Persistence;

/// <summary>
/// Unconditionally initializes and migrates the PostgreSQL database across all environments,
/// seamlessly baselining legacy pre-migration schemas into __EFMigrationsHistory.
/// </summary>
public static class DatabaseInitializer
{
    public static async Task InitializeAsync(
        IServiceProvider services,
        IHostEnvironment environment,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        using var scope = services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<VaultzDbContext>();

        if (!dbContext.Database.IsRelational())
        {
            await dbContext.Database.EnsureCreatedAsync(cancellationToken);
            return;
        }

        var canConnect = await dbContext.CanConnectAsync(cancellationToken);
        if (!canConnect)
        {
            if (environment.IsDevelopment() || environment.IsEnvironment("Testing"))
            {
                logger.LogWarning("PostgreSQL is not reachable in {Environment}; skipping database initialization.", environment.EnvironmentName);
                return;
            }

            logger.LogCritical("Unable to connect to PostgreSQL database during startup in {Environment}.", environment.EnvironmentName);
            throw new InvalidOperationException("Unable to connect to PostgreSQL database at startup.");
        }

        var (usersExists, historyExists) = await InspectSchemaStateAsync(dbContext, cancellationToken);

        if (usersExists && !historyExists)
        {
            logger.LogInformation("Detected existing pre-EF-history PostgreSQL schema; applying idempotent upgrade statements and baselining __EFMigrationsHistory.");
            await ApplyIdempotentUpgradeSqlAsync(dbContext, logger, cancellationToken);
            await BaselineMigrationsHistoryAsync(dbContext, cancellationToken);
        }

        await dbContext.Database.MigrateAsync(cancellationToken);
    }

    private static async Task<(bool UsersExists, bool HistoryExists)> InspectSchemaStateAsync(
        VaultzDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var conn = dbContext.Database.GetDbConnection();
        var shouldClose = conn.State != ConnectionState.Open;
        if (shouldClose)
        {
            await conn.OpenAsync(cancellationToken);
        }

        try
        {
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = """
                SELECT
                    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'),
                    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '__EFMigrationsHistory');
                """;

            await using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            if (await reader.ReadAsync(cancellationToken))
            {
                return (reader.GetBoolean(0), reader.GetBoolean(1));
            }

            return (false, false);
        }
        finally
        {
            if (shouldClose)
            {
                await conn.CloseAsync();
            }
        }
    }

    private static async Task ApplyIdempotentUpgradeSqlAsync(
        VaultzDbContext dbContext,
        ILogger logger,
        CancellationToken cancellationToken)
    {
        var sqlStatements = new[]
        {
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN NOT NULL DEFAULT FALSE;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(256) NULL;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token_expires_at_utc TIMESTAMPTZ NULL;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(256) NULL;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token_expires_at_utc TIMESTAMPTZ NULL;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_type INT NOT NULL DEFAULT 0;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(256) NULL;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_otp_code VARCHAR(16) NULL;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_otp_expires_at_utc TIMESTAMPTZ NULL;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_recovery_codes TEXT NULL;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INT NOT NULL DEFAULT 0;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS lockout_end_utc TIMESTAMPTZ NULL;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at_utc TIMESTAMPTZ NULL;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(64) NULL;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_user_agent VARCHAR(512) NULL;",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS security_stamp VARCHAR(64) NOT NULL DEFAULT '';",
            "ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;",
            "CREATE INDEX IF NOT EXISTS ix_accounts_user_id_is_default ON accounts (user_id, is_default);",
            "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS destination_amount NUMERIC(19, 4) NULL;",
            "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS destination_currency_code CHAR(3) NULL;",
            "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(19, 6) NULL;",
            """
            DO $$
            BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'account_id') THEN
                    ALTER TABLE categories ADD COLUMN account_id UUID NULL;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budgets' AND column_name = 'account_id') THEN
                    ALTER TABLE budgets ADD COLUMN account_id UUID NULL;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'savings_goals' AND column_name = 'account_id') THEN
                    ALTER TABLE savings_goals ADD COLUMN account_id UUID NULL;
                END IF;
            END $$;
            """,
            "CREATE INDEX IF NOT EXISTS ix_categories_user_id_account_id ON categories (user_id, account_id);",
            "CREATE INDEX IF NOT EXISTS ix_savings_goals_user_id_account_id ON savings_goals (user_id, account_id);",
            "DROP INDEX IF EXISTS ux_budgets_user_period_category_currency;",
            "CREATE UNIQUE INDEX IF NOT EXISTS ux_budgets_user_period_category_account_currency ON budgets (user_id, year, month, category_id, account_id, currency_code);",
            """
            CREATE TABLE IF NOT EXISTS lending_records (
                "Id" UUID PRIMARY KEY,
                user_id VARCHAR(128) NOT NULL,
                account_id UUID NOT NULL,
                type INT NOT NULL,
                counterparty VARCHAR(100) NOT NULL,
                original_amount NUMERIC(19, 4) NOT NULL,
                remaining_amount NUMERIC(19, 4) NOT NULL,
                currency_code CHAR(3) NOT NULL,
                due_date DATE NULL,
                notes VARCHAR(500) NULL,
                status INT NOT NULL,
                created_at_utc TIMESTAMPTZ NOT NULL,
                updated_at_utc TIMESTAMPTZ NULL
            );
            """,
            "CREATE INDEX IF NOT EXISTS ix_lending_records_user_id_account_id ON lending_records (user_id, account_id);",
            "CREATE INDEX IF NOT EXISTS ix_lending_records_user_id_status ON lending_records (user_id, status);",
            """
            CREATE TABLE IF NOT EXISTS lending_payments (
                "Id" UUID PRIMARY KEY,
                lending_record_id UUID NOT NULL REFERENCES lending_records("Id") ON DELETE CASCADE,
                amount NUMERIC(19, 4) NOT NULL,
                currency_code CHAR(3) NOT NULL,
                occurred_on DATE NOT NULL,
                notes VARCHAR(500) NULL,
                created_at_utc TIMESTAMPTZ NOT NULL,
                updated_at_utc TIMESTAMPTZ NULL
            );
            """,
            "CREATE INDEX IF NOT EXISTS ix_lending_payments_lending_record_id ON lending_payments (lending_record_id);",
            """
            CREATE TABLE IF NOT EXISTS notifications (
                "Id" UUID PRIMARY KEY,
                user_id VARCHAR(128) NOT NULL,
                title VARCHAR(150) NOT NULL,
                message VARCHAR(1000) NOT NULL,
                type INT NOT NULL,
                is_read BOOLEAN NOT NULL DEFAULT FALSE,
                read_at_utc TIMESTAMPTZ NULL,
                action_url VARCHAR(300) NULL,
                created_at_utc TIMESTAMPTZ NOT NULL,
                updated_at_utc TIMESTAMPTZ NULL
            );
            """,
            "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at_utc TIMESTAMPTZ NULL;",
            "CREATE INDEX IF NOT EXISTS ix_notifications_user_id_created_at_utc ON notifications (user_id, created_at_utc DESC);",
            "CREATE INDEX IF NOT EXISTS ix_notifications_user_id_is_read ON notifications (user_id, is_read);",
            "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS budget_slice_id UUID NULL;",
            "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS account_allocation_id UUID NULL;",
            "CREATE INDEX IF NOT EXISTS ix_transactions_budget_slice_id ON transactions (budget_slice_id);",
            "CREATE INDEX IF NOT EXISTS ix_transactions_account_allocation_id ON transactions (account_allocation_id);",
            """
            CREATE TABLE IF NOT EXISTS account_allocations (
                "Id" UUID PRIMARY KEY,
                user_id VARCHAR(128) NOT NULL,
                account_id UUID NOT NULL,
                name VARCHAR(100) NOT NULL,
                category INT NOT NULL,
                balance NUMERIC(19, 4) NOT NULL,
                target_amount NUMERIC(19, 4) NULL,
                color VARCHAR(50) NULL,
                icon VARCHAR(50) NULL,
                is_archived BOOLEAN NOT NULL DEFAULT FALSE,
                created_at_utc TIMESTAMPTZ NOT NULL,
                updated_at_utc TIMESTAMPTZ NULL
            );
            """,
            "CREATE INDEX IF NOT EXISTS ix_account_allocations_user_id_account_id ON account_allocations (user_id, account_id);",
            """
            CREATE TABLE IF NOT EXISTS monthly_budget_plans (
                "Id" UUID PRIMARY KEY,
                user_id VARCHAR(128) NOT NULL,
                account_id UUID NOT NULL,
                year INT NOT NULL,
                month INT NOT NULL,
                total_budget_amount NUMERIC(19, 4) NOT NULL,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                is_swept BOOLEAN NOT NULL DEFAULT FALSE,
                swept_at_utc TIMESTAMPTZ NULL,
                swept_to_allocation_id UUID NULL,
                created_at_utc TIMESTAMPTZ NOT NULL,
                updated_at_utc TIMESTAMPTZ NULL
            );
            """,
            "CREATE INDEX IF NOT EXISTS ix_monthly_budget_plans_user_account_period ON monthly_budget_plans (user_id, account_id, year, month);",
            """
            CREATE TABLE IF NOT EXISTS monthly_budget_slices (
                "Id" UUID PRIMARY KEY,
                user_id VARCHAR(128) NOT NULL,
                monthly_budget_plan_id UUID NOT NULL REFERENCES monthly_budget_plans("Id") ON DELETE CASCADE,
                category_id UUID NULL,
                name VARCHAR(100) NOT NULL,
                allocation_percentage NUMERIC(5, 2) NOT NULL,
                allocated_amount NUMERIC(19, 4) NOT NULL,
                spent_amount NUMERIC(19, 4) NOT NULL DEFAULT 0,
                color VARCHAR(50) NULL,
                created_at_utc TIMESTAMPTZ NOT NULL,
                updated_at_utc TIMESTAMPTZ NULL
            );
            """,
            "CREATE INDEX IF NOT EXISTS ix_monthly_budget_slices_plan_id ON monthly_budget_slices (monthly_budget_plan_id);",
            """
            CREATE TABLE IF NOT EXISTS quick_log_presets (
                "Id" UUID PRIMARY KEY,
                user_id VARCHAR(128) NOT NULL,
                account_id UUID NOT NULL,
                label VARCHAR(50) NOT NULL,
                amount NUMERIC(19, 4) NOT NULL,
                currency_code CHAR(3) NOT NULL,
                type INT NOT NULL,
                category_id UUID NULL,
                budget_slice_id UUID NULL,
                icon VARCHAR(32) NOT NULL,
                color_hex VARCHAR(7) NOT NULL,
                sort_order INT NOT NULL,
                created_at_utc TIMESTAMPTZ NOT NULL,
                updated_at_utc TIMESTAMPTZ NULL
            );
            """,
            "CREATE INDEX IF NOT EXISTS ix_quick_log_presets_user_account_sort ON quick_log_presets (user_id, account_id, sort_order);",
            """
            CREATE TABLE IF NOT EXISTS wishlist_items (
                "Id" UUID PRIMARY KEY,
                user_id VARCHAR(128) NOT NULL,
                account_id UUID NULL,
                category_id UUID NULL,
                name VARCHAR(120) NOT NULL,
                estimated_price NUMERIC(19, 4) NOT NULL,
                currency_code CHAR(3) NOT NULL,
                priority INT NOT NULL,
                status INT NOT NULL,
                target_date DATE NULL,
                url VARCHAR(500) NULL,
                notes VARCHAR(500) NULL,
                purchased_at_utc TIMESTAMPTZ NULL,
                purchased_transaction_id UUID NULL,
                created_at_utc TIMESTAMPTZ NOT NULL,
                updated_at_utc TIMESTAMPTZ NULL
            );
            """,
            "CREATE INDEX IF NOT EXISTS ix_wishlist_items_user_id_status ON wishlist_items (user_id, status);",
            "CREATE INDEX IF NOT EXISTS ix_wishlist_items_user_id_account_id ON wishlist_items (user_id, account_id);",
            """
            CREATE TABLE IF NOT EXISTS quick_notes (
                "Id" UUID PRIMARY KEY,
                user_id VARCHAR(128) NOT NULL,
                account_id UUID NULL,
                title VARCHAR(120) NOT NULL,
                content VARCHAR(4000) NOT NULL,
                color_hex VARCHAR(7) NOT NULL,
                is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
                is_archived BOOLEAN NOT NULL DEFAULT FALSE,
                created_at_utc TIMESTAMPTZ NOT NULL,
                updated_at_utc TIMESTAMPTZ NULL
            );
            """,
            "CREATE INDEX IF NOT EXISTS ix_quick_notes_user_id_pinned_archived ON quick_notes (user_id, is_pinned, is_archived);",
            "CREATE INDEX IF NOT EXISTS ix_quick_notes_user_id_account_id ON quick_notes (user_id, account_id);"
        };

        foreach (var sql in sqlStatements)
        {
            try
            {
                await dbContext.Database.ExecuteSqlRawAsync(sql, cancellationToken);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Idempotent schema upgrade step skipped or failed.");
            }
        }
    }

    private static async Task BaselineMigrationsHistoryAsync(
        VaultzDbContext dbContext,
        CancellationToken cancellationToken)
    {
        await dbContext.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
                "MigrationId" character varying(150) NOT NULL,
                "ProductVersion" character varying(32) NOT NULL,
                CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
            );
            """, cancellationToken);

        var efVersion = typeof(DbContext).Assembly
            .GetCustomAttribute<AssemblyInformationalVersionAttribute>()?
            .InformationalVersion?.Split('+')[0] ?? "10.0.14";

        foreach (var migrationId in dbContext.Database.GetMigrations())
        {
            await dbContext.Database.ExecuteSqlRawAsync(
                "INSERT INTO \"__EFMigrationsHistory\" (\"MigrationId\", \"ProductVersion\") VALUES ({0}, {1}) ON CONFLICT (\"MigrationId\") DO NOTHING;",
                [migrationId, efVersion],
                cancellationToken);
        }
    }
}
