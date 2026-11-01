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

// Explicit CORS configuration for known frontend origins
var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? ["http://localhost:3000"];

builder.Services.AddCors(options =>
{
    options.AddPolicy("VaultzFrontend", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
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
                    await dbContext.Database.ExecuteSqlRawAsync(
                        """
                        ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;
                        CREATE INDEX IF NOT EXISTS ix_accounts_user_id_is_default ON accounts (user_id, is_default);
                        ALTER TABLE categories ADD COLUMN IF NOT EXISTS account_id UUID NULL REFERENCES accounts(id) ON DELETE CASCADE;
                        ALTER TABLE budgets ADD COLUMN IF NOT EXISTS account_id UUID NULL REFERENCES accounts(id) ON DELETE CASCADE;
                        ALTER TABLE savings_goals ADD COLUMN IF NOT EXISTS account_id UUID NULL REFERENCES accounts(id) ON DELETE CASCADE;
                        CREATE INDEX IF NOT EXISTS ix_categories_user_id_account_id ON categories (user_id, account_id);
                        CREATE INDEX IF NOT EXISTS ix_savings_goals_user_id_account_id ON savings_goals (user_id, account_id);

                        CREATE TABLE IF NOT EXISTS lending_records (
                            id UUID PRIMARY KEY,
                            user_id VARCHAR(128) NOT NULL,
                            account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
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
                        CREATE INDEX IF NOT EXISTS ix_lending_records_user_id_account_id ON lending_records (user_id, account_id);
                        CREATE INDEX IF NOT EXISTS ix_lending_records_user_id_status ON lending_records (user_id, status);

                        CREATE TABLE IF NOT EXISTS lending_payments (
                            id UUID PRIMARY KEY,
                            lending_record_id UUID NOT NULL REFERENCES lending_records(id) ON DELETE CASCADE,
                            amount NUMERIC(19, 4) NOT NULL,
                            currency_code VARCHAR(3) NOT NULL,
                            occurred_on DATE NOT NULL,
                            notes VARCHAR(500) NULL,
                            created_at_utc TIMESTAMPTZ NOT NULL,
                            updated_at_utc TIMESTAMPTZ NULL
                        );
                        CREATE INDEX IF NOT EXISTS ix_lending_payments_lending_record_id ON lending_payments (lending_record_id);
                        """);
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

app.Run();

// Expose Program class for WebApplicationFactory integration tests
public partial class Program;
