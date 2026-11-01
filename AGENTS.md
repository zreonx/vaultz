# Vaultz — AI Coding Agent Instructions (`AGENTS.md`)

> **Canonical Guidance:** This file is the authoritative entrypoint for all AI coding agents working in the Vaultz repository. Do not violate documented architectural, security, or financial modeling rules without first explaining the reason and obtaining explicit user approval.

---

## 1. What Vaultz Is

**Vaultz** is a multi-user Personal Finance Management application that enables individuals to track and manage:
- Financial accounts
- Income, expenses, and account-to-account transfers
- Categories and monthly/periodic budgets
- Savings goals and recurring transactions
- Financial reports and analytics

Every financial record is strictly isolated to its owning user. Correctness, monetary precision, and data isolation take precedence over speed or convenience.

---

## 2. Approved Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend (`apps/web`)** | Next.js (App Router), TypeScript (`strict: true`), Tailwind CSS, shadcn/ui, TanStack Query, React Hook Form, Zod, Vitest |
| **Backend (`apps/api`)** | ASP.NET Core Web API, C# (.NET 10 LTS), Entity Framework Core, PostgreSQL (`Npgsql`), Custom JWT Auth (`JwtBearer` + PBKDF2-SHA256), FluentValidation, OpenAPI |
| **Infrastructure & QA** | Docker, Docker Compose, PostgreSQL, xUnit, `WebApplicationFactory`, Testcontainers, GitHub Actions (future CI/CD) |

**Strict Prohibitions:**
- Do **not** introduce microservices; Vaultz is a **Modular Monolith**.
- Do **not** introduce MediatR or generic repository (`IRepository<T>`) abstractions unless a documented requirement justifies them.
- Do **not** add Redis, message brokers, or external dependencies without a justified current requirement.

---

## 3. Approved Architecture

1. **Frontend (`apps/web`):** Feature-Based Architecture (`src/features/<domain>`), separating server rendering (Next.js Server Components) from interactive client state (TanStack Query) and typed HTTP communication (`src/lib/api`).
2. **Backend (`apps/api`):**
   - **Clean Architecture Dependency Direction:**
     - `Vaultz.Domain` -> *(no project dependencies; no EF Core or ASP.NET Core references)*
     - `Vaultz.Application` -> depends on `Vaultz.Domain`
     - `Vaultz.Infrastructure` -> depends on `Vaultz.Application`, `Vaultz.Domain`
     - `Vaultz.Api` -> depends on `Vaultz.Application`, `Vaultz.Infrastructure` (composition root)
   - **Vertical Slice Architecture:** Feature use cases inside `Vaultz.Application/Features/<Feature>/<UseCase>` own their request models, validators, handlers, and response DTOs.
   - **Lightweight CQRS:** Explicit Separation of Commands (state-mutating) and Queries (read-only) using direct, explicit handler classes injected via DI.
   - **Thin HTTP Boundary:** Controllers/endpoints map HTTP requests to application handlers and return standardized status codes and `ProblemDetails` errors.

---

## 4. Required Reading Before Making Changes

Before modifying code, inspect the relevant harness documents:

- **Rules (`.agent/rules/`):**
  - [`.agent/rules/architecture.md`](.agent/rules/architecture.md) — System boundaries, dependency rules, CQRS, and modular monolith principles.
  - [`.agent/rules/backend.md`](.agent/rules/backend.md) — .NET 10, EF Core, FluentValidation, vertical slices, and API conventions.
  - [`.agent/rules/frontend.md`](.agent/rules/frontend.md) — Next.js App Router, feature slices, TanStack Query, forms, and UI conventions.
  - [`.agent/rules/database.md`](.agent/rules/database.md) — PostgreSQL, monetary precision (`decimal`/`numeric`), currency, UTC/dates, and user isolation.
  - [`.agent/rules/security.md`](.agent/rules/security.md) — Authentication, authorization, tenant isolation, secret handling, and CORS.
  - [`.agent/rules/testing.md`](.agent/rules/testing.md) — Backend xUnit/integration tests and frontend typecheck/lint/unit/build checks.
- **Workflows (`.agent/workflows/`):**
  - [`.agent/workflows/feature-development.md`](.agent/workflows/feature-development.md)
  - [`.agent/workflows/bug-fixing.md`](.agent/workflows/bug-fixing.md)
  - [`.agent/workflows/code-review.md`](.agent/workflows/code-review.md)
- **Context & Docs:**
  - [`.agent/context/product-overview.md`](.agent/context/product-overview.md) & [`.agent/context/technical-stack.md`](.agent/context/technical-stack.md)
  - [`docs/architecture/overview.md`](docs/architecture/overview.md) and [`docs/decisions/ADR-001-architecture.md`](docs/decisions/ADR-001-architecture.md)

---

## 5. Coding, Financial, Security, and Testing Standards

- **Monetary Precision:** Always use `decimal` in C# and `numeric(19,4)` (or documented precision) in PostgreSQL. **Never** use `float` or `double` for money.
- **Explicit Currency:** Every monetary value and account must explicitly record its ISO 4217 currency code.
- **Transfers vs. Income/Expense:** Account-to-account transfers are neither income nor expense in cash-flow analytics, and balances must never be double-counted.
- **Data Isolation:** Every financial entity belongs to a `UserId`. Never trust a `UserId` supplied in a client request body/query; always resolve the authenticated user on the backend.
- **Secrets & Privacy:** Never commit `.env` files or secrets. Never log passwords, tokens, or sensitive financial payloads. Do not store auth tokens in `localStorage`.
- **Verification Integrity:** Never claim a build or test passed unless you actually executed the command and verified a zero exit code. Do not suppress failing tests.

---

## 6. How to Approach Work

### New Features
Follow [`.agent/workflows/feature-development.md`](.agent/workflows/feature-development.md):
1. Understand requirements and ask for clarification on ambiguous financial or architectural rules.
2. Inspect existing code and documentation.
3. Identify affected vertical slices and database changes.
4. Present a concise plan.
5. Implement the smallest complete vertical slice across Domain, Application, Infrastructure, API, and Frontend.
6. Write unit and integration tests (including user data isolation checks).
7. Run verification commands (`dotnet test`, `dotnet build`, `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`).
8. Update documentation and `docs/development/roadmap.md` if milestone status changes.

### Bug Fixes
Follow [`.agent/workflows/bug-fixing.md`](.agent/workflows/bug-fixing.md):
1. Reproduce and isolate the root cause before changing code.
2. Add or update a regression test that fails before the fix and passes after.
3. Apply a minimal, targeted fix that respects architectural boundaries.
4. Verify all affected builds and tests.

### Documentation Updates
- Update `docs/architecture/database-design.md` whenever schema rules, entities, or financial invariants change.
- Create a new ADR under `docs/decisions/` if proposing an approved change to architecture or stack.
- Keep `README.md` and `docs/development/setup.md` accurate whenever environment variables, ports, or scripts change.

### Reporting Completed Work
When reporting work to the user, always include:
1. Summary of changes and architectural boundaries respected.
2. List of created or modified files.
3. Exact build and test commands executed and their actual results.
4. Any remaining open questions, assumptions, or follow-up steps.
