# Backend Rules (`.NET 10` / ASP.NET Core)

These rules apply to all C# code inside `apps/api/`.

---

## 1. Solution and Project Structure

- **`Vaultz.Domain`**: Entities, value objects, domain enums, domain exceptions, and core interfaces. Zero external NuGet dependencies on EF Core, ASP.NET Core, or Npgsql.
- **`Vaultz.Application`**: Vertical slice use cases (`Features/<Feature>/<UseCase>`), application interfaces (`Common/Interfaces/IVaultzDbContext.cs`), validation (`FluentValidation`), and application exceptions.
- **`Vaultz.Infrastructure`**: `VaultzDbContext`, EF Core entity configurations (`IEntityTypeConfiguration<T>`), PostgreSQL migrations, ASP.NET Core Identity persistence, and system service implementations.
- **`Vaultz.Api`**: Controllers/Minimal API endpoints, middleware (`GlobalExceptionHandler`), OpenAPI configuration, authentication/authorization setup, and `Program.cs` composition root.

---

## 2. Vertical Slice & Lightweight CQRS Conventions

- Organize every business operation under `Vaultz.Application/Features/<FeatureName>/<UseCaseName>/`.
- **Naming conventions:**
  - Command: `<UseCase>Command.cs` (immutable `record`)
  - Query: `<UseCase>Query.cs` (immutable `record`)
  - Validator: `<UseCase>Validator.cs` (inherits `AbstractValidator<TRequest>`)
  - Handler: `<UseCase>Handler.cs` (exposes `HandleAsync(request, cancellationToken)`)
  - Response: `<UseCase>Response.cs` (immutable `record`)
- Do **not** use MediatR. Register handlers in DI and inject them directly into endpoints/controllers.
- Always propagate `CancellationToken` through every async method call (`HandleAsync`, EF Core queries, `SaveChangesAsync`).

---

## 3. API Contract & HTTP Conventions

- Prefix all versioned application routes with `/api/v1/...` (e.g., `/api/v1/accounts`, `/api/v1/transactions`).
- Health checks are exposed at `/health` and `/api/v1/health`.
- Use standard HTTP status codes:
  - `200 OK` for successful reads and synchronous updates returning a body.
  - `201 Created` with a `Location` header for resource creation.
  - `204 No Content` for updates or deletions returning no body.
  - `400 Bad Request` / `422 Unprocessable Entity` with RFC 9457 `ValidationProblemDetails` for validation failures.
  - `401 Unauthorized` for unauthenticated requests.
  - `403 Forbidden` when accessing resources not permitted.
  - `404 Not Found` when an entity does not exist or does not belong to the current user.
  - `500 Internal Server Error` with sanitized `ProblemDetails` (never leak stack traces in production).

---

## 4. C# Coding Standards

- Target **.NET 10 LTS** (`net10.0`) with `<Nullable>enable</Nullable>` and `<ImplicitUsings>enable</ImplicitUsings>`.
- Treat nullable compiler warnings seriously; avoid null-forgiving operators (`!`) except in EF Core backing properties or verified test setup.
- Use `decimal` for all currency/monetary amounts.
- Use `DateTimeOffset` (UTC) for timestamps and `DateOnly` for calendar financial dates where appropriate.
- Keep methods focused and small; prefer `sealed` on classes that are not designed for inheritance (including handlers, validators, and DTOs).
