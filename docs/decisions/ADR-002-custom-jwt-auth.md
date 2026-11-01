# ADR-002: Custom JWT Authentication Replacing ASP.NET Core Identity

- **Status:** Accepted
- **Date:** 2026-10-31
- **Supersedes:** Identity persistence section of `ADR-001`

---

## 1. Context

While `ADR-001` initially listed ASP.NET Core Identity for user persistence, `IdentityDbContext` introduces seven framework-specific tables (`AspNetUsers`, `AspNetRoles`, `AspNetUserClaims`, etc.) and couples user management to framework identity stores. We want a lean, explicit, self-contained **JWT Authentication** implementation that fits our Clean Architecture + Vertical Slice design without ASP.NET Core Identity bloat.

---

## 2. Decision

1. **Pure Domain `UserAccount` Entity (`Vaultz.Domain/Entities/UserAccount.cs`):**
   - Persist users in a single clean `users` table (`id`, `email`, `full_name`, `password_hash`, `default_currency_code`, `created_at_utc`, `updated_at_utc`) with a unique index on `email`.
2. **Self-Contained PBKDF2-SHA256 Password Hashing (`PasswordHasher.cs`):**
   - Hash passwords using `Rfc2898DeriveBytes.Pbkdf2` with a 16-byte cryptographic random salt, 100,000 iterations of SHA-256, and constant-time comparison (`CryptographicOperations.FixedTimeEquals`).
3. **Custom JWT Token Generation & Validation (`JwtAuthService.cs`):**
   - Issue HMAC-SHA256 signed JWTs containing `sub`/`NameIdentifier`, `email`, `name`, `currency`, and `jti`.
   - Deliver the signed JWT both in the `AuthResultResponse` payload (`accessToken`, `expiresAtUtc`) for API clients AND in an `HttpOnly`, `SameSite=Lax` cookie (`vaultz.jwt`) for the browser client so tokens are never stored in `localStorage`.
   - Configure `JwtBearerEvents.OnMessageReceived` to accept JWTs from either the `Authorization: Bearer <token>` header or the `vaultz.jwt` cookie.
