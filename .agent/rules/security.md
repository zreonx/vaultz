# Security Rules

Vaultz handles private personal financial data. Security controls must be enforced by default across all layers.

---

## 1. Secrets & Configuration Management

- **Never hardcode credentials, connection strings, API keys, or signing keys** in source code, `appsettings.json`, or `docker-compose.yml`.
- Never commit `.env` files containing secrets (`.gitignore` blocks `.env*` except `.env.example`).
- Always provide safe `.env.example` templates containing clearly marked placeholder values only.
- Inject sensitive configuration via environment variables, user secrets (`dotnet user-secrets`), or a production secret manager.

---

## 2. Authentication & Session Security

- Do **not** store authentication or refresh tokens in browser `localStorage` or `sessionStorage` where they are vulnerable to XSS exfiltration.
- When cookie-based authentication is configured, enforce `HttpOnly`, `Secure` (in production), and `SameSite=Lax` or `SameSite=Strict`.
- Use ASP.NET Core Identity with strong password hashing and lockout policies when authentication is implemented in Milestone 2.

---

## 3. Authorization & Multi-Tenant User Isolation

- **Backend Is Authoritative:** Enforce authentication and authorization on every protected backend endpoint. UI route guards exist only for user experience.
- **Never Trust Client Ownership IDs:** Never accept `userId` from request bodies, query strings, or route parameters to determine record ownership. Always read the authenticated user's identity from `ClaimsPrincipal` on the server.
- **Prevent Insecure Direct Object References (IDOR):** When querying, updating, or deleting a resource by ID (`GET /api/v1/accounts/{id}`), always scope the query by both `Id == request.Id` and `UserId == currentUser.Id`. Return `404 Not Found` (not `403 Forbidden`) when another user's resource ID is requested, to prevent resource enumeration.

---

## 4. Input Validation & Data Protection

- Validate all external input at the application boundary using FluentValidation on the backend and Zod on the frontend.
- Execute all database queries via parameterized EF Core LINQ queries. Never concatenate raw user input into SQL strings.
- **Safe Error Handling:** Use `GlobalExceptionHandler` to return standardized RFC 9457 `ProblemDetails`. Never expose internal exception messages, SQL errors, or stack traces in non-development environments.
- **CORS:** Configure CORS explicitly for known, configured frontend origins (`AllowedOrigins`). Never use `AllowAnyOrigin()` with `AllowCredentials()`.
- **Safe Logging:** Never log passwords, authorization headers, cookies, session tokens, or sensitive raw financial payloads.

---

## 5. Honesty About Security Posture

- Do not claim Vaultz is "production-secure" simply because foundational middleware exists. Document which controls are active vs. planned (see `docs/architecture/overview.md`).
