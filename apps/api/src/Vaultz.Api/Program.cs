using Microsoft.EntityFrameworkCore;
using Vaultz.Api.Middleware;
using Vaultz.Api.Services;
using Vaultz.Application;
using Vaultz.Application.Common.Interfaces;
using Vaultz.Infrastructure;
using Vaultz.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

// Load uncommitted local settings/secrets if present
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

// Add Clean Architecture layer registrations
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();

// Live FX exchange rate synchronization with automatic fallback
builder.Services.AddHttpClient();
builder.Services.AddSingleton<LiveExchangeRateService>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<LiveExchangeRateService>());

// HTTP controllers & standardized ProblemDetails error handling
builder.Services.AddControllers();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

// OpenAPI document generation (exposed in Development)
builder.Services.AddOpenApi();

// HealthChecks foundation
builder.Services.AddHealthChecks();

// Explicit CORS configuration for known frontend and mobile origins
var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? ["http://localhost:3000", "http://localhost:8081", "http://localhost:19006"];

builder.Services.AddCors(options =>
{
    options.AddPolicy("VaultzFrontend", policy =>
    {
        if (builder.Environment.IsDevelopment())
        {
            policy.SetIsOriginAllowed(origin =>
            {
                if (string.IsNullOrEmpty(origin)) return false;
                if (allowedOrigins.Contains(origin)) return true;
                if (Uri.TryCreate(origin, UriKind.Absolute, out var uri))
                {
                    return uri.Host == "localhost"
                        || uri.Host == "127.0.0.1"
                        || uri.Host.StartsWith("192.168.")
                        || uri.Host.StartsWith("10.");
                }
                return false;
            })
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
        }
        else
        {
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        }
    });
});

var app = builder.Build();

// Ensure database schema is created in Development when PostgreSQL is reachable
if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<VaultzDbContext>();
    try
    {
        if (await dbContext.CanConnectAsync())
        {
            await dbContext.Database.EnsureCreatedAsync();

            if (dbContext.Database.IsRelational())
            {
                try
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
                    """
                    DO $$ 
                    BEGIN 
                        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'account_id') THEN
                            ALTER TABLE categories ADD COLUMN account_id UUID NULL REFERENCES accounts("Id") ON DELETE CASCADE;
                        END IF;
                        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'budgets' AND column_name = 'account_id') THEN
                            ALTER TABLE budgets ADD COLUMN account_id UUID NULL REFERENCES accounts("Id") ON DELETE CASCADE;
                        END IF;
                        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'savings_goals' AND column_name = 'account_id') THEN
                            ALTER TABLE savings_goals ADD COLUMN account_id UUID NULL REFERENCES accounts("Id") ON DELETE CASCADE;
                        END IF;
                    END $$;
                    """,
                    "CREATE INDEX IF NOT EXISTS ix_categories_user_id_account_id ON categories (user_id, account_id);",
                    "CREATE INDEX IF NOT EXISTS ix_savings_goals_user_id_account_id ON savings_goals (user_id, account_id);",
                    """
                    CREATE TABLE IF NOT EXISTS lending_records (
                        "Id" UUID PRIMARY KEY,
                        user_id VARCHAR(128) NOT NULL,
                        account_id UUID NOT NULL REFERENCES accounts("Id") ON DELETE CASCADE,
                        type INT NOT NULL,
                        counterparty VARCHAR(100) NOT NULL,
                        original_amount NUMERIC(19, 4) NOT NULL,
                        remaining_amount NUMERIC(19, 4) NOT NULL,
                        currency_code VARCHAR(3) NOT NULL,
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
                        currency_code VARCHAR(3) NOT NULL,
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
                        action_url VARCHAR(500) NULL,
                        created_at_utc TIMESTAMPTZ NOT NULL,
                        updated_at_utc TIMESTAMPTZ NULL
                    );
                    """,
                    "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS updated_at_utc TIMESTAMPTZ NULL;",
                    "CREATE INDEX IF NOT EXISTS ix_notifications_user_id_created_at_utc ON notifications (user_id, created_at_utc DESC);",
                    "CREATE INDEX IF NOT EXISTS ix_notifications_user_id_is_read ON notifications (user_id, is_read);",
                    "UPDATE users SET is_email_verified = TRUE;"
                };

                foreach (var sql in sqlStatements)
                {
                    try
                    {
                        await dbContext.Database.ExecuteSqlRawAsync(sql);
                    }
                    catch (Exception sqlEx)
                    {
                        app.Logger.LogWarning(sqlEx, "Schema migration statement skipped or failed: {Sql}", sql);
                    }
                }
                }
                catch (Exception sqlEx)
                {
                    app.Logger.LogWarning(sqlEx, "Schema alter execution skipped or failed.");
                }
            }

            try
            {
                await DemoDataSeeder.SeedAsync(app.Services);
            }
            catch (Exception seedEx)
            {
                app.Logger.LogWarning(seedEx, "Demo data seeding encountered an issue.");
            }
        }
    }
    catch (Exception ex)
    {
        app.Logger.LogWarning(ex, "Database initialization skipped.");
    }
}

app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}
else
{
    app.UseHttpsRedirection();
}

app.UseCors("VaultzFrontend");

app.UseAuthentication();
app.UseAuthorization();

app.MapHealthChecks("/health");
app.MapControllers();
app.MapHub<Vaultz.Infrastructure.Notifications.NotificationHub>("/hubs/notifications");

app.Run();

// Expose Program class for WebApplicationFactory integration tests
public partial class Program;
