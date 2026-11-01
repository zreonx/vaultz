using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Vaultz.Application.Features.System.GetSystemStatus;
using Vaultz.Domain.Common;
using Vaultz.Infrastructure.Persistence;

namespace Vaultz.IntegrationTests.Api;

public sealed class HealthAndPipelineIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public HealthAndPipelineIntegrationTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Development");
        });
    }

    [Fact]
    public async Task GetHealth_ReturnsHealthyPlainText()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync("/health");
        var content = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Healthy", content);
    }

    [Fact]
    public async Task GetApiV1Health_ReturnsSystemStatusContract()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/v1/health");
        var payload = await response.Content.ReadFromJsonAsync<SystemStatusResponse>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(payload);
        Assert.Equal("Vaultz.Api", payload.Service);
        Assert.Equal("Healthy", payload.Status);
        Assert.Equal("0.1.0", payload.Version);
        Assert.Equal("Development", payload.Environment);
        Assert.Equal("Configured", payload.DatabaseStatus);
    }

    [Fact]
    public async Task GetOpenApiDocument_InDevelopment_ReturnsValidSpecification()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync("/openapi/v1.json");
        var body = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("/api/v1/health", body);
    }

    [Fact]
    public void CleanArchitecture_DependencyDirection_IsEnforced()
    {
        var domainAssembly = typeof(DomainException).Assembly;
        var applicationAssembly = typeof(GetSystemStatusQuery).Assembly;
        var infrastructureAssembly = typeof(VaultzDbContext).Assembly;

        var domainReferences = domainAssembly.GetReferencedAssemblies().Select(a => a.Name).ToList();
        var applicationReferences = applicationAssembly.GetReferencedAssemblies().Select(a => a.Name).ToList();

        Assert.DoesNotContain(domainReferences, name => name != null && name.StartsWith("Vaultz.", StringComparison.Ordinal));
        Assert.DoesNotContain(domainReferences, name => name != null && name.Contains("EntityFrameworkCore", StringComparison.Ordinal));
        Assert.DoesNotContain(domainReferences, name => name != null && name.Contains("AspNetCore", StringComparison.Ordinal));

        Assert.DoesNotContain("Vaultz.Infrastructure", applicationReferences);
        Assert.DoesNotContain("Vaultz.Api", applicationReferences);
        Assert.Contains("Vaultz.Domain", infrastructureAssembly.GetReferencedAssemblies().Select(a => a.Name));
        Assert.Contains("Vaultz.Application", infrastructureAssembly.GetReferencedAssemblies().Select(a => a.Name));
    }
}
