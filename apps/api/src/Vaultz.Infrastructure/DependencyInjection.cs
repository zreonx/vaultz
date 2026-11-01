using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using Vaultz.Application.Common.Interfaces;
using Vaultz.Infrastructure.Authentication;
using Vaultz.Infrastructure.Persistence;

namespace Vaultz.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? "Host=localhost;Port=5432;Database=vaultz_dev;Username=vaultz;Password=vaultz_local_dev_password_change_me";

        var canReachPostgres = CanOpenPostgresConnection(connectionString);

        services.AddDbContext<VaultzDbContext>(options =>
        {
            if (canReachPostgres)
            {
                options.UseNpgsql(
                    connectionString,
                    npgsqlOptions =>
                    {
                        npgsqlOptions.MigrationsAssembly(typeof(VaultzDbContext).Assembly.FullName);
                    });
            }
            else
            {
                options.UseInMemoryDatabase("VaultzLocalDev");
            }
        });

        services.AddScoped<IVaultzDbContext>(provider =>
            provider.GetRequiredService<VaultzDbContext>());

        var jwtOptions = new JwtOptions();
        configuration.GetSection(JwtOptions.SectionName).Bind(jwtOptions);
        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));

        var signingKeyBytes = Encoding.UTF8.GetBytes(jwtOptions.SigningKey);

        services
            .AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                options.RequireHttpsMetadata = false;
                options.SaveToken = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = jwtOptions.Issuer,
                    ValidateAudience = true,
                    ValidAudience = jwtOptions.Audience,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(signingKeyBytes),
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromMinutes(1)
                };

                // Support both standard Authorization: Bearer <token> headers AND HttpOnly cookie (vaultz.jwt)
                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        if (string.IsNullOrEmpty(context.Token) &&
                            context.Request.Cookies.TryGetValue(jwtOptions.CookieName, out var cookieToken) &&
                            !string.IsNullOrWhiteSpace(cookieToken))
                        {
                            context.Token = cookieToken;
                        }

                        return Task.CompletedTask;
                    }
                };
            });

        services.AddAuthorization();
        services.AddScoped<IAuthService, JwtAuthService>();

        return services;
    }

    private static bool CanOpenPostgresConnection(string connectionString)
    {
        try
        {
            var builder = new NpgsqlConnectionStringBuilder(connectionString)
            {
                Timeout = 2
            };
            using var connection = new NpgsqlConnection(builder.ConnectionString);
            connection.Open();
            return true;
        }
        catch
        {
            return false;
        }
    }
}
