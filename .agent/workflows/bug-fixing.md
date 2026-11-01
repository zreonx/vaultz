# Bug Fixing Workflow

Follow this disciplined workflow whenever diagnosing and fixing a defect in Vaultz. Never apply speculative workarounds or suppress tests to mask a bug.

---

## Step-by-Step Procedure

### 1. Understand and Reproduce the Defect
- Gather the symptom, expected behavior, actual behavior, HTTP status/payload, or UI reproduction steps.
- Inspect logs, stack traces, or failing test outputs.

### 2. Inspect Relevant Code and Architectural Rules
- Trace the execution path across the relevant frontend feature (`apps/web/src/features/`), API endpoint (`Vaultz.Api`), vertical slice handler (`Vaultz.Application/Features/`), domain entity (`Vaultz.Domain`), or database configuration (`Vaultz.Infrastructure`).
- Check `.agent/rules/database.md` and `.agent/rules/security.md` if the bug touches monetary calculations, balance updates, dates/timezones, or user ownership filters.

### 3. Isolate the Root Cause
- Identify why the bug occurs rather than treating only the surface symptom.
- Check whether the same root cause exists in adjacent vertical slices (for example, missing `UserId` filter or rounding discrepancy).

### 4. Write a Failing Regression Test First
- Before applying the fix (whenever practical), add a unit test in `Vaultz.UnitTests`, an integration test in `Vaultz.IntegrationTests`, or a frontend test in `apps/web` that reproduces the failure.
- Confirm that the test fails for the expected reason.

### 5. Implement a Minimal, Targeted Fix
- Fix the defect in the appropriate architectural layer:
  - Business invariant bug -> `Vaultz.Domain`
  - Use-case orchestration or validation bug -> `Vaultz.Application`
  - Query mapping, transaction, or EF Core configuration bug -> `Vaultz.Infrastructure`
  - HTTP status or serialization bug -> `Vaultz.Api`
  - Client state, form, or rendering bug -> `apps/web`
- Do not bundle unrelated refactoring with a bug fix.

### 6. Execute Verification Suite
- Run the regression test and confirm it passes.
- Run the full affected test and build suite:
  - Backend: `dotnet build apps/api/Vaultz.sln` and `dotnet test apps/api/Vaultz.sln`
  - Frontend: `npm --prefix apps/web run typecheck`, `npm --prefix apps/web run lint`, `npm --prefix apps/web run test`, `npm --prefix apps/web run build`

### 7. Update Documentation (If Applicable)
- If the bug revealed an undocumented edge case or required clarifying a rule, update the relevant document in `docs/` or `.agent/rules/`.

### 8. Report Root Cause, Fix, and Verification
- State the root cause clearly.
- List modified files and the regression test added.
- Report the exact verification commands executed and their results.
