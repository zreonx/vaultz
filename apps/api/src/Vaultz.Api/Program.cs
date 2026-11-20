using Microsoft.AspNetCore.HttpOverrides;
using Vaultz.Api.Middleware;
using Vaultz.Api.Services;
using Vaultz.Application;
using Vaultz.Application.Common.Interfaces;
using Vaultz.Infrastructure;
using Vaultz.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

// Load uncommitted local settings/secrets if present
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

// Add Clean Architecture layer registrations (validates production config early)
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration, builder.Environment);

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
});

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
            policy.SetIsOriginAllowed(origin =>
            {
                if (string.IsNullOrEmpty(origin)) return false;
                if (allowedOrigins.Contains(origin)) return true;
                if (Uri.TryCreate(origin, UriKind.Absolute, out var uri))
                {
                    return uri.Host.EndsWith(".vercel.app", StringComparison.OrdinalIgnoreCase);
                }
                return false;
            })
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
        }
    });
});

var app = builder.Build();

// Unconditionally initialize/migrate the database across all environments
await DatabaseInitializer.InitializeAsync(app.Services, app.Environment, app.Logger);

// Seed local demo user & sample data strictly in Development
if (app.Environment.IsDevelopment())
{
    try
    {
        await DemoDataSeeder.SeedAsync(app.Services);
    }
    catch (Exception seedEx)
    {
        app.Logger.LogWarning(seedEx, "Demo data seeding encountered an issue.");
    }
}

app.UseExceptionHandler();
app.UseMiddleware<RequestLoggingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}
else
{
    app.UseForwardedHeaders();
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
