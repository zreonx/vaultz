using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Vaultz.Infrastructure.Persistence;

/// <summary>
/// Design-time factory ensuring EF Core CLI tools always generate PostgreSQL migrations
/// even when the local PostgreSQL container is offline.
/// </summary>
public sealed class VaultzDbContextFactory : IDesignTimeDbContextFactory<VaultzDbContext>
{
    public VaultzDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<VaultzDbContext>();
        optionsBuilder.UseNpgsql(
            "Host=localhost;Port=5432;Database=vaultz_dev;Username=vaultz;Password=vaultz_local_dev_password_change_me",
            npgsqlOptions =>
            {
                npgsqlOptions.MigrationsAssembly(typeof(VaultzDbContext).Assembly.FullName);
            });

        return new VaultzDbContext(optionsBuilder.Options);
    }
}
