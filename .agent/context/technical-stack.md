# Vaultz — Technical Stack

This document records the approved technology stack and tooling versions used in the Vaultz repository.

---

## 1. Frontend (`apps/web`)

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | Next.js (App Router) | Server Components, routing, layouts, production bundling |
| **Language** | TypeScript (`strict: true`) | Static type checking across components, hooks, and API contracts |
| **Styling** | Tailwind CSS | Utility-first styling with design tokens |
| **UI Components** | shadcn/ui (Radix UI + Tailwind) | Accessible, composable UI primitives |
| **Client Server-State** | TanStack Query (`@tanstack/react-query`) | Client-side caching, background refetching, and mutations |
| **Forms** | React Hook Form + `@hookform/resolvers` | Performant, accessible form state management |
| **Schema Validation** | Zod | Runtime schema parsing and form validation |
| **Icons** | `lucide-react` | Consistent iconography |
| **Testing** | Vitest + Testing Library | Fast unit and component test execution |

---

## 2. Backend (`apps/api`)

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Runtime & SDK** | .NET 10 LTS (`net10.0`) / C# | Modern, high-performance managed runtime |
| **Web Framework** | ASP.NET Core Web API | HTTP endpoints, middleware, DI, `ProblemDetails` |
| **Architecture** | Vertical Slice + Clean Architecture + Lightweight CQRS | Modular monolith with inward dependency rules |
| **ORM** | Entity Framework Core 10 (`Npgsql.EntityFrameworkCore.PostgreSQL`) | Strongly-typed LINQ queries, configurations, and migrations |
| **Database** | PostgreSQL 17 | Relational persistence with exact `numeric` support |
| **Authentication** | Custom JWT Auth (`Microsoft.AspNetCore.Authentication.JwtBearer` + PBKDF2-SHA256) | Stateless HMAC-SHA256 JWT tokens stored in `HttpOnly` cookies (`vaultz.jwt`) and `Authorization: Bearer` headers (`ADR-002`) |
| **Validation** | FluentValidation | Explicit request/command validation rules |
| **API Documentation** | `Microsoft.AspNetCore.OpenApi` | OpenAPI 3.x specification generation in development |

---

## 3. Infrastructure & Quality Assurance

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Local Database** | Docker & Docker Compose (`postgres:17-alpine`) | Reproducible local PostgreSQL with named volume and healthcheck |
| **Backend Unit Testing** | xUnit (`Vaultz.UnitTests`) | Fast domain, validator, and handler unit tests |
| **Backend Integration Testing** | xUnit + `Microsoft.AspNetCore.Mvc.Testing` + Testcontainers (`Vaultz.IntegrationTests`) | Full HTTP pipeline and PostgreSQL integration testing |
| **Frontend Quality Gates** | TypeScript (`tsc --noEmit`), ESLint, Vitest, `next build` | Type safety, lint rules, unit tests, and build verification |
| **Future CI/CD** | GitHub Actions | Automated build, lint, and test pipelines |
