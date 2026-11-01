# Vaultz — AI Agent Harness & Project Initialization

> **Target milestone:** Vaultz v0.1 — Repository Harness & Project Foundation  
> **Purpose:** Establish a reliable repository-level AI agent harness, document the architecture, and initialize the frontend and backend foundations.  
> **Execution rule:** Do not implement the full finance application during initialization.

---

# 1. Project Overview

**Project name:** Vaultz  
**Product:** Personal Finance Management Application

Vaultz helps users manage their personal finances by tracking:

- Accounts
- Income
- Expenses
- Transfers
- Budgets
- Categories
- Savings goals
- Recurring transactions
- Financial reports and analytics

The application must eventually support multiple users, with strict isolation of their financial data.

Do not implement all these features during project initialization.

---

# 2. Approved Technology Stack

Use this stack unless a compatibility issue requires a documented adjustment.

## Frontend

- Next.js with App Router
- TypeScript with strict mode
- Tailwind CSS
- shadcn/ui
- TanStack Query
- React Hook Form
- Zod

**Architecture:** Feature-Based Architecture.

## Backend

- ASP.NET Core Web API
- C#
- .NET 10 LTS
- Entity Framework Core
- PostgreSQL
- ASP.NET Core Identity
- FluentValidation
- OpenAPI

**Architecture:**

- Vertical Slice Architecture
- Clean Architecture dependency principles
- Lightweight CQRS
- Modular Monolith

Do not introduce microservices.

Do not introduce MediatR or generic repository abstractions unless a documented requirement justifies them.

## Infrastructure and Testing

- Docker
- Docker Compose
- PostgreSQL
- GitHub Actions as a future CI/CD foundation
- xUnit
- Integration testing
- Testcontainers where appropriate

Use stable, compatible dependency versions. Verify available SDKs and tooling before scaffolding. Prefer official documentation for framework-specific decisions.

---

# 3. Repository-Level AI Agent Harness

Before implementing application code, establish the repository-level AI agent harness.

Create this structure:

```text
Vaultz/
├── AGENTS.md
├── README.md
│
├── .agent/
│   ├── rules/
│   │   ├── architecture.md
│   │   ├── backend.md
│   │   ├── frontend.md
│   │   ├── database.md
│   │   ├── security.md
│   │   └── testing.md
│   │
│   ├── workflows/
│   │   ├── feature-development.md
│   │   ├── bug-fixing.md
│   │   └── code-review.md
│   │
│   └── context/
│       ├── product-overview.md
│       └── technical-stack.md
│
├── docs/
│   ├── architecture/
│   │   ├── overview.md
│   │   ├── frontend-architecture.md
│   │   ├── backend-architecture.md
│   │   └── database-design.md
│   │
│   ├── decisions/
│   │   └── ADR-001-architecture.md
│   │
│   └── development/
│       ├── setup.md
│       └── roadmap.md
│
├── apps/
│   ├── web/
│   └── api/
│
├── infrastructure/
│   └── docker/
│
└── tests/
```

All documents must contain meaningful, project-specific instructions. Do not create empty placeholder documents or generic boilerplate.

## 3.1 Root `AGENTS.md`

`AGENTS.md` is the primary instruction file for AI coding agents.

It must explain:

- What Vaultz is.
- The approved technology stack.
- The approved architecture.
- Which documentation must be read before making changes.
- Coding standards.
- Security requirements.
- Testing requirements.
- How to approach new features.
- How to approach bug fixes.
- How to update documentation.
- How to report completed work.

The agent must not violate documented architecture without first explaining the reason and obtaining approval.

The root instructions should be concise enough to be practical. Put detailed rules in the relevant `.agent/rules/` documents and workflows in `.agent/workflows/`.

If a coding tool uses a different instruction-file convention, keep `AGENTS.md` as the canonical project guidance and add only the minimal adapter or pointer required by that tool. Do not maintain conflicting copies of the same rules.

## 3.2 Architecture rules

Document these principles:

1. Frontend uses feature-based organization.
2. Backend uses Vertical Slice Architecture.
3. Backend respects Clean Architecture dependency direction.
4. Application deployment remains a modular monolith.
5. Commands handle state-changing operations.
6. Queries handle read operations.
7. Domain contains business rules and must not depend on infrastructure.
8. Infrastructure implements abstractions defined by inner layers.
9. Controllers and endpoints should remain thin.
10. Avoid unnecessary abstractions and premature optimization.
11. Features should own their use-case-specific request models, validators, handlers, and response models where appropriate.
12. Shared code belongs in shared locations only when it is genuinely reused and has a clear responsibility.

## 3.3 Workflow rules

Create a feature-development workflow.

Whenever implementing a feature, the agent must:

1. Understand the requirement.
2. Inspect the existing implementation and relevant documentation.
3. Identify affected features and architectural boundaries.
4. Present a concise implementation plan.
5. Identify required database changes.
6. Implement the smallest complete vertical slice.
7. Add appropriate tests.
8. Run relevant tests and build commands.
9. Update documentation if necessary.
10. Report modified files and verification results.

Create equivalent workflows for bug fixing and code review.

Do not silently expand the scope of a task. For ambiguous or potentially destructive decisions, ask for clarification.

---

# 4. Project Initialization

After the harness and documentation are complete, initialize the actual applications.

Use this repository structure:

```text
Vaultz/
├── apps/
│   ├── web/
│   └── api/
│
├── tests/
│   ├── backend/
│   └── frontend/
│
├── infrastructure/
│   └── docker/
│
├── docs/
├── .agent/
├── AGENTS.md
└── README.md
```

## 4.1 Frontend initialization

Create the Next.js application inside `apps/web`.

Requirements:

- Use App Router.
- Enable TypeScript strict mode.
- Configure Tailwind CSS.
- Initialize shadcn/ui.
- Configure TanStack Query.
- Configure React Hook Form and Zod.
- Establish feature-based folder organization.
- Create reusable API client infrastructure.
- Configure environment variables.
- Add a basic application layout.
- Create a minimal Vaultz dashboard shell.
- Establish a consistent error-handling strategy.
- Add appropriate linting and formatting configuration.

Suggested source structure:

```text
apps/web/
└── src/
    ├── app/
    │   ├── (auth)/
    │   ├── (dashboard)/
    │   ├── layout.tsx
    │   └── globals.css
    │
    ├── components/
    │   ├── ui/
    │   ├── layout/
    │   └── shared/
    │
    ├── features/
    │   ├── accounts/
    │   ├── transactions/
    │   ├── budgets/
    │   ├── categories/
    │   ├── savings/
    │   └── reports/
    │
    ├── lib/
    │   ├── api/
    │   ├── auth/
    │   └── utils/
    │
    ├── hooks/
    ├── types/
    └── config/
```

Each feature should own its feature-specific components, API functions, hooks, schemas, and types when appropriate.

Do not create empty feature implementations simply to populate the folder tree. Add only the minimal structure needed to demonstrate the convention.

### Frontend data responsibilities

- Use Server Components for suitable initial rendering and server-side work.
- Use TanStack Query for interactive client-side API state, caching, mutations, and refetching where appropriate.
- Do not put every request through TanStack Query by default.
- Keep API communication in a reusable, typed API client layer.
- Do not duplicate backend business rules in frontend validation.
- Frontend validation improves user experience; the backend remains authoritative.

Do not implement actual financial features yet.

## 4.2 Backend initialization

Create the .NET solution inside `apps/api`.

Use separate projects:

- `Vaultz.Api`
- `Vaultz.Application`
- `Vaultz.Domain`
- `Vaultz.Infrastructure`

Establish correct project references and enforce dependency direction.

Suggested structure:

```text
apps/api/
├── Vaultz.sln
│
├── src/
│   ├── Vaultz.Api/
│   │   ├── Controllers/
│   │   ├── Middleware/
│   │   ├── Extensions/
│   │   ├── Configuration/
│   │   └── Program.cs
│   │
│   ├── Vaultz.Application/
│   │   ├── Common/
│   │   │   ├── Interfaces/
│   │   │   ├── Exceptions/
│   │   │   └── Behaviors/
│   │   └── Features/
│   │       ├── Accounts/
│   │       ├── Transactions/
│   │       ├── Budgets/
│   │       └── Categories/
│   │
│   ├── Vaultz.Domain/
│   │   ├── Common/
│   │   ├── Entities/
│   │   ├── ValueObjects/
│   │   └── Enums/
│   │
│   └── Vaultz.Infrastructure/
│       ├── Persistence/
│       │   ├── Configurations/
│       │   ├── Migrations/
│       │   └── VaultzDbContext.cs
│       ├── Identity/
│       ├── Services/
│       └── DependencyInjection.cs
│
└── tests/
    ├── Vaultz.UnitTests/
    └── Vaultz.IntegrationTests/
```

The exact folder layout may be adjusted if the agent can justify a simpler structure. Do not create empty folders or speculative abstractions.

### Project responsibilities

#### `Vaultz.Api`

Responsibilities:

- HTTP endpoints/controllers
- Middleware
- Dependency injection composition
- API configuration
- OpenAPI documentation
- Global exception handling
- Authentication and authorization configuration at the HTTP boundary

#### `Vaultz.Application`

Responsibilities:

- Feature use cases
- Commands and queries
- Handlers
- Request validation
- Application interfaces
- Application-level orchestration

Use vertical slices for feature organization.

Example:

```text
Features/
└── Transactions/
    ├── CreateTransaction/
    │   ├── CreateTransactionCommand.cs
    │   ├── CreateTransactionHandler.cs
    │   └── CreateTransactionValidator.cs
    │
    ├── GetTransactions/
    │   ├── GetTransactionsQuery.cs
    │   └── GetTransactionsHandler.cs
    │
    └── UpdateTransaction/
```

Do not create every feature implementation yet.

#### `Vaultz.Domain`

Responsibilities:

- Domain entities
- Value objects
- Enums
- Business rules
- Domain exceptions

Must not reference Infrastructure, EF Core, or ASP.NET Core.

#### `Vaultz.Infrastructure`

Responsibilities:

- EF Core
- PostgreSQL persistence
- Database configurations
- Database migrations
- Identity persistence
- External service implementations

Infrastructure implements abstractions defined by the appropriate inner layers.

### Initial backend functionality

Implement only:

1. API startup.
2. Dependency injection configuration.
3. PostgreSQL connection configuration.
4. EF Core `DbContext` foundation.
5. Basic health endpoint.
6. Global exception handling.
7. OpenAPI configuration.
8. Basic automated test project setup.

Do not implement authentication, accounts, transactions, or budgets yet.

Do not create speculative entities or database tables.

---

# 5. Database and Financial Rules

Document these requirements before feature development:

- Use PostgreSQL.
- Use `decimal` in C# and appropriate PostgreSQL `numeric` columns for monetary values.
- Never use `float` or `double` for financial calculations.
- Store currency explicitly.
- Use UTC timestamps for persisted event times, while preserving appropriate date-only concepts for financial periods.
- Enforce user ownership on financial records.
- Use database constraints and appropriate indexes.
- Use database transactions for operations involving multiple related records.
- Transfers must not be treated as ordinary income or expenses.
- Account balances must not be updated twice for the same transaction.
- Define a consistent strategy for transaction edits, reversals, and deletions.
- Define rounding and precision rules deliberately rather than relying on implicit conversions.

Do not prematurely implement a ledger system or other advanced accounting infrastructure without a justified requirement.

The database design document should distinguish confirmed decisions from open questions. Do not invent financial requirements and record them as approved decisions.

---

# 6. Security Rules

The application handles private financial information.

Establish these standards:

- Never hardcode credentials.
- Use environment variables or an appropriate secret store for secrets.
- Never commit `.env` files containing secrets.
- Provide safe example environment files with placeholder values only.
- Validate all external input.
- Enforce authorization on the backend.
- Never trust frontend ownership identifiers.
- Prevent users from accessing another user's financial records.
- Use secure authentication practices.
- Use parameterized database operations through EF Core.
- Avoid exposing internal exception details in production.
- Configure CORS explicitly for known frontend origins.
- Do not store authentication tokens in `localStorage`.
- Use secure cookie settings when cookie-based authentication is selected.
- Do not log passwords, tokens, secrets, or sensitive financial data.
- Document security assumptions and remaining limitations.

Do not claim that the application is production-secure merely because the initial security configuration exists.

---

# 7. Testing Requirements

Establish testing infrastructure.

## Backend

- xUnit
- Unit testing for business rules
- Integration testing for API and database behavior
- Testcontainers where appropriate
- Tests for authorization and user data isolation as financial features are introduced

## Frontend

- Appropriate component and utility testing setup
- TypeScript type checking
- Linting
- Production build verification

Do not claim that tests passed unless they were actually executed.

Do not suppress failing tests merely to achieve a successful build.

Document commands used to run tests.

---

# 8. Docker and Local Development

Prepare Docker Compose configuration under:

```text
infrastructure/docker/
```

Requirements:

- Provide a PostgreSQL service for local development.
- Use a named Docker volume for persistent database data.
- Configure credentials through environment variables.
- Include a health check for PostgreSQL.
- Avoid exposing unnecessary ports.
- Provide an example environment file without real secrets.
- Document startup, shutdown, and database reset commands.
- Do not put production secrets in Compose files.

The API may run locally outside Docker initially, provided the setup instructions explain how it connects to the containerized PostgreSQL instance.

Do not add Redis, message brokers, or other infrastructure without a current requirement.

---

# 9. API and Frontend Contract

Establish a consistent API contract strategy.

- Use REST conventions.
- Use an `/api/v1` route prefix for application endpoints.
- Configure OpenAPI documentation in development.
- Define consistent error responses.
- Use appropriate HTTP status codes.
- Plan pagination, filtering, and sorting conventions.
- Keep request and response contracts explicit.
- Consider generating TypeScript API types from the OpenAPI document to reduce frontend/backend contract mismatches.

Do not invent endpoints for features that have not been implemented.

---

# 10. Documentation Requirements

Create meaningful documentation.

## `README.md`

Include:

- Vaultz overview
- Technology stack
- Repository structure
- Prerequisites
- Local setup instructions
- How to start PostgreSQL
- How to run the API
- How to run the frontend
- How to run tests
- Links to architecture documentation

## Architecture documentation

`docs/architecture/overview.md`:

- Overall system architecture
- Frontend/API/database responsibilities
- Modular monolith rationale
- Dependency direction

`docs/architecture/frontend-architecture.md`:

- Feature-based organization
- App Router conventions
- Component responsibilities
- Data fetching and caching conventions
- Form validation conventions

`docs/architecture/backend-architecture.md`:

- Vertical Slice Architecture
- Clean Architecture dependency principles
- CQRS conventions
- Project responsibilities
- Feature organization
- Dependency injection conventions

`docs/architecture/database-design.md`:

- Database technology
- Naming conventions
- Monetary precision
- Currency handling
- User ownership
- Migration conventions
- Open financial modeling questions

## Architecture Decision Record

Create `docs/decisions/ADR-001-architecture.md`.

Record the approved decisions:

- Next.js feature-based frontend
- ASP.NET Core backend
- Vertical Slice Architecture
- Clean Architecture dependency principles
- Lightweight CQRS
- Modular monolith deployment
- PostgreSQL
- Entity Framework Core

Include context, decision, consequences, and alternatives considered.

## Roadmap

Create `docs/development/roadmap.md` with the planned development sequence:

1. Project foundation
2. Authentication and user management
3. Account management
4. Transactions
5. Categories
6. Budget management
7. Dashboard and analytics
8. Savings goals
9. Recurring transactions
10. Financial reports and exports

Mark features as planned, in progress, or completed based on actual implementation. Do not mark work complete without verification.

---

# 11. Agent Execution Rules

Follow these rules throughout execution:

1. Inspect the repository before making changes.
2. Do not overwrite existing user files.
3. Do not assume installed SDKs or dependencies.
4. Verify compatibility before installing packages.
5. Prefer official documentation for framework-specific decisions.
6. Use clear, descriptive naming.
7. Avoid unnecessary abstractions.
8. Do not introduce additional technologies without justification.
9. Keep changes within the requested scope.
10. Explain important architectural decisions.
11. Run actual verification commands.
12. Maintain documentation as the implementation evolves.
13. Never claim a command succeeded unless its result confirms success.
14. Distinguish completed work from planned work.
15. Ask before making destructive changes or introducing a significant architectural deviation.

If an essential prerequisite is missing, report it and ask before making assumptions that could compromise the project.

Do not use mock implementations that could be mistaken for production-ready financial functionality.

---

# 12. Project Initialization Checklist

The project initialization is complete only when the following have been verified:

## Agent harness

- [ ] Root `AGENTS.md` exists and contains actionable instructions.
- [ ] Architecture, backend, frontend, database, security, and testing rules exist.
- [ ] Feature development, bug fixing, and code review workflows exist.
- [ ] Product and technical context documents exist.
- [ ] Architecture documentation exists.
- [ ] Architecture decision record exists.
- [ ] Development setup and roadmap documents exist.

## Frontend

- [ ] Next.js project is initialized in `apps/web`.
- [ ] App Router is configured.
- [ ] TypeScript strict mode is enabled.
- [ ] Tailwind CSS is configured.
- [ ] shadcn/ui is initialized.
- [ ] TanStack Query is configured.
- [ ] React Hook Form and Zod are configured.
- [ ] Feature-based structure is established.
- [ ] API client foundation exists.
- [ ] Basic application layout exists.
- [ ] Linting and type checking work.
- [ ] Production build succeeds.

## Backend

- [ ] .NET solution exists in `apps/api`.
- [ ] API, Application, Domain, and Infrastructure projects exist.
- [ ] Project references follow dependency direction.
- [ ] Vertical Slice organization is documented and established.
- [ ] PostgreSQL configuration is prepared.
- [ ] EF Core `DbContext` foundation exists.
- [ ] Health endpoint responds successfully.
- [ ] Global exception handling is configured.
- [ ] OpenAPI documentation is available in development.
- [ ] Backend test projects are initialized.
- [ ] Backend build succeeds.

## Infrastructure and documentation

- [ ] Docker Compose configuration exists.
- [ ] PostgreSQL uses a named persistent volume.
- [ ] Database health check is configured.
- [ ] Environment examples contain no real secrets.
- [ ] README contains local setup instructions.
- [ ] Relevant tests have been executed.
- [ ] Verification results are documented.
- [ ] No unrequested financial features have been implemented.

---

# 13. Final Deliverable

After completing both phases, provide a report containing:

1. Harness files created.
2. Final repository structure.
3. Frontend initialization details.
4. Backend initialization details.
5. Database and Docker configuration.
6. Project dependency relationships.
7. Commands used to initialize the applications.
8. Tests and build commands executed.
9. Verification results.
10. Remaining setup requirements.
11. Known limitations or unresolved decisions.
12. Recommended next development milestone.

Do not automatically start implementing the next financial feature.

The immediate objective is to establish a solid, documented, working foundation for Vaultz.

**Think like a senior software architect, work like a disciplined engineer, and make every architectural decision intentional.**
