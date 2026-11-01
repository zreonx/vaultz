# Testing Rules

Testing is mandatory for verifying architectural boundaries, financial accuracy, and user data isolation.

---

## 1. Core Testing Principles

- **Never fabricate test results:** Never claim that tests or builds passed unless you actually executed the command and inspected the output.
- **No test suppression:** Never delete, skip (`[Fact(Skip = ...)]`), or weaken assertions simply to make a failing build pass. Fix the underlying bug or update the test only when the specification genuinely changed.
- **Deterministic execution:** Tests must not depend on external network services, shared mutable state, or wall-clock timing flakiness.

---

## 2. Backend Testing (`apps/api/tests/`)

### `Vaultz.UnitTests` (xUnit)
- Tests domain entities, value objects, financial calculation rules, FluentValidation validators, and isolated application handlers.
- Must run fast in-memory without requiring a live database or network connection.
- Test edge cases for financial logic: zero amounts, negative values, high-precision decimals, rounding boundaries, and mismatched currencies.

### `Vaultz.IntegrationTests` (xUnit + `WebApplicationFactory` / Testcontainers)
- Tests the HTTP pipeline, DI registration, middleware (`GlobalExceptionHandler`), health endpoints, OpenAPI availability, and EF Core persistence behavior.
- As financial features are added, every endpoint must include integration tests verifying:
  1. Valid requests persist and return expected status codes and contracts.
  2. Invalid requests return `400 Bad Request` with `ValidationProblemDetails`.
  3. Unauthenticated requests return `401 Unauthorized`.
  4. **User isolation:** User A cannot read, modify, or delete User B's accounts, transactions, budgets, or categories.

### Backend Verification Commands
```powershell
dotnet build apps/api/Vaultz.sln
dotnet test apps/api/Vaultz.sln
```

---

## 3. Frontend Testing (`apps/web/`)

- **Unit & Component Tests (Vitest):** Test API client error handling, utility formatters, Zod validation schemas, and UI components.
- **Static Analysis:** Run TypeScript type checking (`tsc --noEmit`) and ESLint.
- **Production Build Check:** Verify `next build` compiles all Server and Client Components cleanly.

### Frontend Verification Commands
```powershell
cd apps/web
npm run typecheck
npm run lint
npm run test
npm run build
```
