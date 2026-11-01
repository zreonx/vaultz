# Backend Test Suites

The .NET 10 backend test projects are part of [`apps/api/Vaultz.sln`](../../apps/api/Vaultz.sln) and reside in:

- **Unit Tests:** [`apps/api/tests/Vaultz.UnitTests`](../../apps/api/tests/Vaultz.UnitTests)
  - Fast, isolated xUnit tests for `Vaultz.Domain` invariants (such as currency validation and decimal monetary rules) and `Vaultz.Application` vertical slice handlers and FluentValidation validators.
- **Integration Tests:** [`apps/api/tests/Vaultz.IntegrationTests`](../../apps/api/tests/Vaultz.IntegrationTests)
  - End-to-end HTTP pipeline tests using `WebApplicationFactory<Program>` (and Testcontainers for PostgreSQL container integration) verifying health checks, `/api/v1` endpoints, OpenAPI document generation, and `GlobalExceptionHandler` responses.

## Running Backend Tests

From the repository root:
```powershell
dotnet test apps/api/Vaultz.sln
```
