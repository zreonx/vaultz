# Architecture Rules

These principles govern the structural organization and dependency boundaries of Vaultz across both frontend and backend applications.

---

## Core Architectural Principles

1. **Frontend Uses Feature-Based Organization**
   - Business domains (`accounts`, `transactions`, `budgets`, `categories`, `savings`, `reports`) live under `apps/web/src/features/<feature>`.
   - Each feature encapsulates its own UI components, hooks, schemas, API calls, and types.
   - Next.js `src/app/` routes remain thin composition shells that wire pages and layouts to feature modules.

2. **Backend Uses Vertical Slice Architecture**
   - Application use cases are organized by feature and action inside `Vaultz.Application/Features/<Feature>/<UseCase>` (e.g., `Features/Transactions/CreateTransaction`).
   - Avoid wide horizontal service classes (`ITransactionService`, `IAccountService`) that become bloated god-objects.

3. **Backend Respects Clean Architecture Dependency Direction**
   - Dependencies always point inward toward the domain:
     - `Vaultz.Domain` depends on nothing outside the .NET Base Class Library.
     - `Vaultz.Application` depends only on `Vaultz.Domain`.
     - `Vaultz.Infrastructure` depends on `Vaultz.Application` and `Vaultz.Domain`.
     - `Vaultz.Api` depends on `Vaultz.Application` and `Vaultz.Infrastructure` (solely for DI registration and startup composition).
   - `Vaultz.Domain` and `Vaultz.Application` must never reference `Vaultz.Infrastructure` or ASP.NET Core HTTP libraries.

4. **Application Deployment Remains a Modular Monolith**
   - Do not split Vaultz into microservices, distributed sagas, or separate deployable backend APIs.
   - Maintain clean module boundaries within a single deployable ASP.NET Core API and single PostgreSQL database.

5. **Commands Handle State-Changing Operations**
   - Any operation that creates, updates, reverses, or deletes data is modeled as a Command (`<Action>Command`, `<Action>Validator`, `<Action>Handler`).
   - Commands enforce business invariants, user ownership, and transactional integrity.

6. **Queries Handle Read Operations**
   - Any operation that retrieves data without side effects is modeled as a Query (`<GetSomething>Query`, `<GetSomething>Handler`, `<Something>Response`).
   - Queries must never mutate state and may project directly to read DTOs using `.AsNoTracking()`.

7. **Domain Contains Business Rules and Must Not Depend on Infrastructure**
   - Domain entities, value objects, enums, and domain exceptions reside in `Vaultz.Domain`.
   - Financial invariants (e.g., valid currency codes, non-negative quantities where required, balance integrity rules) belong in the domain model.

8. **Infrastructure Implements Abstractions Defined by Inner Layers**
   - Persistence (`VaultzDbContext`), identity providers, clock abstractions, and external integrations live in `Vaultz.Infrastructure` and implement interfaces defined in `Vaultz.Application/Common/Interfaces`.

9. **Controllers and Endpoints Should Remain Thin**
   - HTTP endpoints in `Vaultz.Api` are responsible only for routing, model binding, invoking the appropriate Application handler, and mapping results to HTTP responses (`200 OK`, `201 Created`, `204 No Content`, or `ProblemDetails`).
   - Never place business logic, database queries, or financial calculations inside controllers.

10. **Avoid Unnecessary Abstractions and Premature Optimization**
    - Do not introduce MediatR, AutoMapper, or generic `IRepository<T>` / `IUnitOfWork` wrappers over EF Core unless a specific, documented problem requires them.
    - Prefer explicit C# mapping methods and direct handler invocation.

11. **Features Own Their Use-Case Artifacts**
    - Each vertical slice owns its request record, FluentValidation validator, handler class, and response DTO. Do not share mutable request/response DTOs across unrelated use cases.

12. **Shared Code Requires Genuine Reuse**
    - Only promote code to `Common/` or `src/components/shared/` when it is used by multiple distinct features and has a single, well-defined responsibility.
