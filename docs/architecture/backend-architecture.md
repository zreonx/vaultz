# Backend Architecture (`apps/api`)

## 1. Architectural Style

The Vaultz backend combines three complementary patterns inside a **Modular Monolith**:

1. **Clean Architecture Dependency Principles:** Inner layers (`Vaultz.Domain`, `Vaultz.Application`) define business rules and abstractions; outer layers (`Vaultz.Infrastructure`, `Vaultz.Api`) implement persistence, framework glue, and HTTP transport.
2. **Vertical Slice Architecture:** Application features are organized by specific use case (`Features/<Feature>/<UseCase>`) rather than broad horizontal service layers.
3. **Lightweight CQRS:** Every use case is explicitly modeled as either a state-changing **Command** or a side-effect-free **Query**, without introducing MediatR or complex pipeline reflection.

---

## 2. Solution and Project Responsibilities

```text
apps/api/
├── Vaultz.sln
├── src/
│   ├── Vaultz.Domain/          # Enterprise & financial domain rules (no external framework deps)
│   ├── Vaultz.Application/     # Vertical slice use cases, commands/queries, validators, interfaces
│   ├── Vaultz.Infrastructure/  # EF Core, PostgreSQL, Identity persistence, service implementations
│   └── Vaultz.Api/             # Controllers, Middleware, OpenAPI, DI composition root
└── tests/
    ├── Vaultz.UnitTests/       # Fast unit tests for Domain and Application slices
    └── Vaultz.IntegrationTests/# End-to-end HTTP and persistence integration tests
```

| Project | Allowed Project References | Key Responsibilities |
| :--- | :--- | :--- |
| `Vaultz.Domain` | *None* | Base entities, value objects, enums, domain invariants, domain exceptions |
| `Vaultz.Application` | `Vaultz.Domain` | Commands, queries, handlers, FluentValidation validators, `IVaultzDbContext` |
| `Vaultz.Infrastructure` | `Vaultz.Application`, `Vaultz.Domain` | `VaultzDbContext`, EF Core configurations, migrations, PostgreSQL connection setup |
| `Vaultz.Api` | `Vaultz.Application`, `Vaultz.Infrastructure` | Thin controllers/endpoints, `GlobalExceptionHandler`, CORS, OpenAPI, `Program.cs` |

---

## 3. Vertical Slice Organization & Lightweight CQRS

Each use case lives in its own folder under `Vaultz.Application/Features/<Feature>/<UseCase>/`:

```text
Vaultz.Application/Features/
├── System/
│   └── GetSystemStatus/
│       ├── GetSystemStatusQuery.cs
│       ├── GetSystemStatusHandler.cs
│       └── SystemStatusResponse.cs
└── Transactions/                   # (Future milestone example)
    ├── CreateTransaction/
    │   ├── CreateTransactionCommand.cs
    │   ├── CreateTransactionValidator.cs
    │   ├── CreateTransactionHandler.cs
    │   └── CreateTransactionResponse.cs
    └── GetTransactions/
        ├── GetTransactionsQuery.cs
        ├── GetTransactionsValidator.cs
        ├── GetTransactionsHandler.cs
        └── TransactionListItemResponse.cs
```

### Why No MediatR or Generic Repository?
- **Explicit Call Graphs:** Injecting `CreateTransactionHandler` directly into a controller makes navigation ("Go to Definition") immediate and eliminates runtime reflection overhead.
- **No Leaky Repository Wrapper:** EF Core's `DbSet<T>` and `VaultzDbContext` (exposed via `IVaultzDbContext` in Application) already implement the Repository and Unit of Work patterns, supporting projections (`.Select(...)`), `.AsNoTracking()`, and atomic transactions without boilerplate wrappers.

---

## 4. Error Handling & API Contract Strategy

- **Route Versioning:** Application endpoints use `/api/v1/...`.
- **Standardized Errors (`GlobalExceptionHandler`):**
  - `ValidationException` -> `400 Bad Request` (`HttpValidationProblemDetails`)
  - `NotFoundException` -> `404 Not Found` (`ProblemDetails`)
  - `DomainException` -> `422 Unprocessable Entity` (`ProblemDetails`)
  - Unhandled exceptions -> `500 Internal Server Error` (`ProblemDetails` with correlation `traceId`, hiding internal details outside Development).
- **Pagination, Filtering, and Sorting Conventions (for collection endpoints):**
  - Query parameters: `page` (1-based, default `1`), `pageSize` (default `20`, max `100`), `sortBy`, `sortDirection` (`asc` | `desc`).
  - Standardized paged envelope: `{ items: T[], page: number, pageSize: number, totalCount: number, totalPages: number }`.
