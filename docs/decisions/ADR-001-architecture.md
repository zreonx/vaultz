# ADR-001: Core System, Frontend, Backend, and Database Architecture

- **Status:** Accepted
- **Date:** 2026-10-31
- **Milestone:** Vaultz v0.1 — Project Initialization

---

## 1. Context

Vaultz is a personal finance management application that will support multiple users with strict isolation of their financial records (accounts, income, expenses, transfers, categories, budgets, savings goals, recurring transactions, and reports).

We need an architecture and technology stack that:
1. Guarantees monetary accuracy, relational integrity, and multi-user data isolation.
2. Keeps cognitive load and operational complexity low while the product is built iteratively across 10 milestones.
3. Prevents tight coupling between domain logic, persistence details, and UI presentation.
4. Enables AI coding agents and human engineers to develop, test, and review features in isolated, predictable slices.

---

## 2. Decision

We adopt the following architectural decisions for Vaultz:

1. **Deployment Topology — Modular Monolith:**
   - Deploy a single ASP.NET Core backend API (`apps/api`), a Next.js web frontend (`apps/web`), and a single PostgreSQL database. Do not use microservices.
2. **Frontend — Next.js App Router with Feature-Based Architecture:**
   - Build `apps/web` using Next.js (App Router), TypeScript (`strict: true`), Tailwind CSS, shadcn/ui, TanStack Query, React Hook Form, and Zod.
   - Organize domain modules under `src/features/<feature>` with a shared typed HTTP client under `src/lib/api`.
3. **Backend — ASP.NET Core (.NET 10 LTS) with Vertical Slice + Clean Architecture + Lightweight CQRS:**
   - Structure `apps/api` into four projects with inward dependency direction:
     - `Vaultz.Domain` (no external framework dependencies)
     - `Vaultz.Application` (depends on `Vaultz.Domain`)
     - `Vaultz.Infrastructure` (depends on `Vaultz.Application` and `Vaultz.Domain`)
     - `Vaultz.Api` (depends on `Vaultz.Application` and `Vaultz.Infrastructure`)
   - Organize use cases as vertical slices (`Features/<Feature>/<UseCase>`) separated into Commands (writes) and Queries (reads).
   - Use direct handler injection and FluentValidation without MediatR or generic repository wrappers.
4. **Database & Persistence — PostgreSQL + Entity Framework Core:**
   - Use PostgreSQL with EF Core (`Npgsql.EntityFrameworkCore.PostgreSQL`).
   - Enforce `decimal` / `numeric(19,4)` for all monetary values, explicit ISO 4217 currency codes, and mandatory `user_id` ownership scoping.

---

## 3. Consequences

### Positive
- **ACID Financial Consistency:** Single-database transactions ensure account balances and transfer legs update atomically.
- **High Feature Cohesion:** Adding or modifying a use case touches a single vertical slice folder in `Vaultz.Application` and a single feature folder in `apps/web/src/features`.
- **Protected Domain Model:** `Vaultz.Domain` remains pure C# and is trivially unit-testable with xUnit.
- **Minimal Indirection:** Avoiding MediatR and generic repositories keeps stack traces shallow and IDE navigation direct.

### Trade-offs & Mitigations
- **Discipline Required on Module Boundaries:** Because all slices share `VaultzDbContext` in a monolith, engineers and AI agents must follow `.agent/rules/architecture.md` and `.agent/rules/database.md` so slices do not bypass domain invariants.
- **Contract Synchronization:** Frontend TypeScript types and backend C# DTOs must stay aligned via `/api/v1` OpenAPI specifications and integration tests.

---

## 4. Alternatives Considered

1. **Microservices Architecture (Separate Account, Transaction, Budget Services):**
   - *Rejected:* Introduces distributed transaction hazards (dual writes, eventual consistency in account balances) and massive operational overhead with zero benefit at current scale.
2. **Traditional N-Tier Horizontal Services (`ITransactionService`, `IAccountRepository`):**
   - *Rejected:* Leads to large, unfocused service classes with dozens of dependencies and leaky generic repositories over EF Core.
3. **MediatR-Heavy Pipeline Architecture:**
   - *Rejected:* Adds indirection and runtime assembly scanning that are unnecessary when explicit command/query handlers can be injected directly via ASP.NET Core DI.
