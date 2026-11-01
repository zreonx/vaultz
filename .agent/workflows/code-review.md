# Code Review Workflow

Use this checklist and workflow when reviewing changes, pull requests, or completed vertical slices in Vaultz.

---

## Step-by-Step Review Procedure

### 1. Scope and Requirement Alignment
- Does the change implement only what was requested without silent scope creep or speculative features?
- Are all ambiguous financial or architectural questions resolved and documented?

### 2. Architecture & Dependency Direction Audit
- **Backend:**
  - Does `Vaultz.Domain` remain completely free of EF Core, ASP.NET Core, and Infrastructure references?
  - Are use cases structured as cohesive vertical slices under `Vaultz.Application/Features/<Feature>/<UseCase>`?
  - Are Commands (state-mutating) and Queries (read-only) cleanly separated?
  - Are Controllers/Endpoints thin, delegating business logic to handlers?
  - Were unnecessary abstractions (MediatR, generic repositories, AutoMapper) avoided?
- **Frontend:**
  - Is feature-specific code placed in `apps/web/src/features/<feature>/` rather than dumped into global folders?
  - Are Server Components used appropriately, with `'use client'` limited to interactive boundaries?
  - Do all API calls go through the typed client layer (`src/lib/api/`)?

### 3. Financial & Database Integrity Audit
- Are all monetary values represented as `decimal` in C# and `numeric(19,4)` in PostgreSQL (zero `float` or `double` usage)?
- Is an explicit ISO 4217 currency code stored and validated on monetary entities?
- Are account-to-account transfers excluded from ordinary income/expense aggregations?
- Are multi-record balance updates wrapped in atomic database transactions so balances can never be updated twice or left inconsistent?
- Are UTC timestamps (`DateTimeOffset`) and calendar dates (`DateOnly`) used appropriately?

### 4. Security & Multi-User Isolation Audit
- Does every database query and mutation filter by the authenticated `UserId` resolved from server claims (never trusting client-provided `userId`)?
- Are cross-entity references (e.g., `AccountId`, `CategoryId`) verified to belong to the same `UserId`?
- Are all inputs validated with FluentValidation (backend) and Zod (frontend)?
- Are secrets, connection strings, and `.env` files kept out of source control, and is sensitive data excluded from logs and production error responses?

### 5. Testing & Verification Audit
- Are unit tests present for domain rules and validators?
- Are integration tests present for endpoints, including negative validation cases and cross-user isolation checks?
- Were build, typecheck, lint, and test commands actually executed and verified to pass?

### 6. Review Output Format
Provide findings grouped by severity:
1. **Blocking Issues (Security, Financial Accuracy, Architecture Violations, Failing Tests)**
2. **Improvements (Edge Cases, Readability, Test Coverage Gaps)**
3. **Nitpicks / Minor Polish**
4. **Verification Status**
