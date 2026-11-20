# Local Development Setup Guide

This guide explains how to configure, run, and verify the Vaultz local development environment.

---

## 1. Prerequisites

Ensure the following tools are installed on your machine:

- **.NET 10 SDK** (`10.0.x` LTS) — verify with `dotnet --version`
- **Node.js** (`v20+` or `v22+` / `v26+`) & **npm** — verify with `node -v` and `npm -v`
- **Docker** & **Docker Compose** — verify with `docker --version` and `docker compose version`
- **Git** — verify with `git --version`

---

## 2. Environment Configuration

Vaultz never commits real secrets to source control. Copy the provided `.env.example` templates before running services locally.

### 2.1 Docker PostgreSQL Environment
```powershell
Copy-Item infrastructure/docker/.env.example infrastructure/docker/.env
```
Default local values in `infrastructure/docker/.env.example`:
- `POSTGRES_USER=vaultz`
- `POSTGRES_PASSWORD=vaultz_local_dev_password_change_me`
- `POSTGRES_DB=vaultz_dev`
- `POSTGRES_PORT=5432`

### 2.2 Frontend Environment
```powershell
Copy-Item apps/web/.env.example apps/web/.env.local
```
Default local values in `apps/web/.env.example`:
- `NEXT_PUBLIC_API_BASE_URL=http://localhost:5180`
- `NEXT_PUBLIC_APP_ENV=development`

### 2.3 Production API Environment (`apps/api/.env.example`)
In non-development environments (`ASPNETCORE_ENVIRONMENT=Production`), startup fails fast if any required secret or production setting is missing or still uses development defaults. Inject the following environment variables (see [`apps/api/.env.example`](../../apps/api/.env.example)):
- `ConnectionStrings__DefaultConnection` — PostgreSQL connection string (must not use dev password)
- `Jwt__SigningKey` — At least 32 UTF-8 bytes for HMAC-SHA256 signing
- `Resend__ApiKey` (or `RESEND_API_KEY`) — Live Resend key when `Resend__Enabled=true`
- `App__FrontendBaseUrl` — Non-localhost `https://` URL for email verification & reset links
- `Cors__AllowedOrigins__0` — Explicit production web/app origins

---

## 3. Starting, Stopping, and Resetting PostgreSQL

### Start PostgreSQL Container
```powershell
docker compose --env-file infrastructure/docker/.env -f infrastructure/docker/docker-compose.yml up -d
```

### Check Container Health Status
```powershell
docker compose --env-file infrastructure/docker/.env -f infrastructure/docker/docker-compose.yml ps
```

### Stop PostgreSQL (Preserving Data Volume)
```powershell
docker compose --env-file infrastructure/docker/.env -f infrastructure/docker/docker-compose.yml down
```

### Reset Database (Destroys Local Volume Data)
```powershell
docker compose --env-file infrastructure/docker/.env -f infrastructure/docker/docker-compose.yml down -v
```

---

## 4. Running the Backend API (`apps/api`)

The ASP.NET Core API connects to the containerized PostgreSQL instance using the connection string configured in `appsettings.Development.json` (or overridden via the `ConnectionStrings__DefaultConnection` environment variable).

```powershell
# Restore and build the solution
dotnet build apps/api/Vaultz.sln

# Run the API on http://localhost:5180
dotnet run --project apps/api/src/Vaultz.Api/Vaultz.Api.csproj
```

Key local endpoints in Development:
- **Health Check (liveness):** `http://localhost:5180/health`
- **API v1 Status Endpoint:** `http://localhost:5180/api/v1/health`
- **OpenAPI Document:** `http://localhost:5180/openapi/v1.json`

---

## 5. Running the Frontend (`apps/web`)

```powershell
cd apps/web
npm install
npm run dev
```

Open `http://localhost:3000` in your browser to view the Vaultz dashboard shell.

---

## 6. Running Tests and Quality Gates

### Backend Tests
```powershell
dotnet test apps/api/Vaultz.sln
```

### Frontend Quality Checks & Tests
```powershell
cd apps/web
npm run typecheck
npm run lint
npm run test
npm run build
```
