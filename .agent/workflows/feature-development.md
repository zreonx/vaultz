# Feature Development Workflow

Follow this 10-step workflow whenever implementing a new feature or vertical slice in Vaultz. Do not silently expand the scope of a task, and ask for clarification if financial or architectural requirements are ambiguous.

---

## Step-by-Step Procedure

### 1. Understand the Requirement
- Clarify the user story, acceptance criteria, financial invariants (currencies, rounding, balance effects), and security/ownership requirements.
- If a requirement is ambiguous or could cause destructive schema/financial impacts, stop and ask the user for clarification before writing code.

### 2. Inspect the Existing Implementation and Relevant Documentation
- Read [`AGENTS.md`](../../AGENTS.md), relevant `.agent/rules/*.md` files, and `docs/architecture/*.md`.
- Inspect existing entities in `Vaultz.Domain`, vertical slices in `Vaultz.Application`, persistence mappings in `Vaultz.Infrastructure`, and frontend feature modules in `apps/web/src/features/`.

### 3. Identify Affected Features and Architectural Boundaries
- Determine which domain entities, value objects, or enums are involved (`Vaultz.Domain`).
- Determine which command/query vertical slices need to be created or updated (`Vaultz.Application/Features/<Feature>/`).
- Determine which API endpoints (`Vaultz.Api`) and frontend feature components/hooks (`apps/web/src/features/<feature>/`) are affected.
- Verify that Clean Architecture dependency direction is strictly preserved.

### 4. Present a Concise Implementation Plan
- Outline the proposed domain changes, vertical slice commands/queries, database migration needs, API endpoints, frontend components, and test cases.

### 5. Identify Required Database Changes
- Check whether new tables, columns, foreign keys, `numeric(19,4)` monetary fields, composite `user_id` indexes, or check constraints are required.
- Create/update `IEntityTypeConfiguration<T>` in `Vaultz.Infrastructure/Persistence/Configurations/` and generate an EF Core migration when appropriate.

### 6. Implement the Smallest Complete Vertical Slice
- **Domain:** Add/update entities and domain invariants.
- **Application:** Add the Command/Query record, FluentValidation validator, Handler, and Response DTO.
- **Infrastructure:** Register persistence mappings and any required services.
- **API:** Add thin controller/endpoint action under `/api/v1/...`.
- **Frontend:** Add typed API function, Zod form schema (if applicable), TanStack Query hook or Server Component integration, and UI component under `apps/web/src/features/<feature>/`.

### 7. Add Appropriate Tests
- **Backend Unit Tests (`Vaultz.UnitTests`):** Domain invariants, monetary calculations, and FluentValidation rules.
- **Backend Integration Tests (`Vaultz.IntegrationTests`):** Endpoint contract, persistence, validation errors, authentication, and cross-user data isolation.
- **Frontend Tests (`apps/web`):** Utility, schema, or component tests where appropriate.

### 8. Run Relevant Tests and Build Commands
- Execute and confirm zero-error results for:
  - `dotnet build apps/api/Vaultz.sln`
  - `dotnet test apps/api/Vaultz.sln`
  - `npm --prefix apps/web run typecheck`
  - `npm --prefix apps/web run lint`
  - `npm --prefix apps/web run test`
  - `npm --prefix apps/web run build`

### 9. Update Documentation if Necessary
- Update `docs/architecture/database-design.md`, `docs/development/roadmap.md`, or `README.md` if schema, endpoints, or milestone progress changed.

### 10. Report Modified Files and Verification Results
- Provide a structured summary listing all created/modified files, architectural decisions made, exact commands executed, and their verification outcomes.
