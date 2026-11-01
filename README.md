# Vaultz

**Vaultz** is a multi-user Personal Finance Management application for tracking financial accounts, income, expenses, account-to-account transfers, categories, budgets, savings goals, recurring transactions, and financial analytics—with strict user data isolation and exact decimal precision.

> **Current Status:** `v0.1` — Personal Finance Management Platform & Project Foundation.

---

## 1. Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend (`apps/web`)** | Next.js (App Router), TypeScript (`strict: true`), Tailwind CSS, shadcn/ui, TanStack Query, React Hook Form, Zod, Vitest |
| **Backend (`apps/api`)** | ASP.NET Core Web API, C# (.NET 10 LTS), Entity Framework Core 10, PostgreSQL (`Npgsql`), FluentValidation, OpenAPI |
| **Architecture** | Feature-Based Frontend + Vertical Slice & Clean Architecture Backend + Lightweight CQRS (Modular Monolith) |
| **Infrastructure & Testing** | Docker Compose, PostgreSQL 17, xUnit, `WebApplicationFactory`, Testcontainers, Vitest |

---

## 2. Repository Structure

```text
Vaultz/
├── README.md                           # Project overview and quickstart guide
├── docs/
│   ├── architecture/                   # System, frontend, backend & database design documentation
│   ├── decisions/                      # Architecture Decision Records
│   └── development/                    # Local setup guide and milestone roadmap
├── apps/
│   ├── web/                            # Next.js App Router frontend application
│   └── api/                            # .NET 10 solution (Domain, Application, Infrastructure, Api, Tests)
├── infrastructure/
│   └── docker/                         # Docker Compose PostgreSQL setup & .env.example
└── tests/
    ├── backend/                        # Backend testing documentation & cross-suite guides
    └── frontend/                       # Frontend testing documentation & cross-suite guides
```

---

## 3. Prerequisites

- **.NET 10 SDK** (`10.0.x` LTS)
- **Node.js** (`v20+`) and **npm**
- **Docker** and **Docker Compose**
- **Git**

---

## 4. Quickstart & Local Setup

### Step 1: Configure Local Environment Files
Copy the safe placeholder templates (never commit real `.env` files):

```powershell
Copy-Item infrastructure/docker/.env.example infrastructure/docker/.env
Copy-Item apps/web/.env.example apps/web/.env.local
```

### Step 2: Start PostgreSQL via Docker Compose
```powershell
docker compose --env-file infrastructure/docker/.env -f infrastructure/docker/docker-compose.yml up -d
```

To stop PostgreSQL:
```powershell
docker compose --env-file infrastructure/docker/.env -f infrastructure/docker/docker-compose.yml down
```

To reset PostgreSQL (destroys local volume data):
```powershell
docker compose --env-file infrastructure/docker/.env -f infrastructure/docker/docker-compose.yml down -v
```

### Step 3: Run the Backend API (`apps/api`)
```powershell
dotnet build apps/api/Vaultz.sln
dotnet run --project apps/api/src/Vaultz.Api/Vaultz.Api.csproj
```
- **API Base URL:** `http://localhost:5180`
- **Health Check:** `http://localhost:5180/health` and `http://localhost:5180/api/v1/health`
- **OpenAPI Spec (Development):** `http://localhost:5180/openapi/v1.json`

### Step 4: Run the Frontend (`apps/web`)
```powershell
cd apps/web
npm install
npm run dev
```
- **Web App URL:** `http://localhost:3000`

---

## 5. Running Tests & Verification

### Backend Tests & Build
```powershell
dotnet build apps/api/Vaultz.sln
dotnet test apps/api/Vaultz.sln
```

### Frontend Typecheck, Lint, Tests, and Build
```powershell
cd apps/web
npm run typecheck
npm run lint
npm run test
npm run build
```

---

## 6. Architecture & Development Documentation

- **Agent Instructions:** [`AGENTS.md`](AGENTS.md)
- **System Architecture Overview:** [`docs/architecture/overview.md`](docs/architecture/overview.md)
- **Frontend Architecture:** [`docs/architecture/frontend-architecture.md`](docs/architecture/frontend-architecture.md)
- **Backend Architecture:** [`docs/architecture/backend-architecture.md`](docs/architecture/backend-architecture.md)
- **Database Design & Financial Rules:** [`docs/architecture/database-design.md`](docs/architecture/database-design.md)
- **ADR-001 (Architecture Decisions):** [`docs/decisions/ADR-001-architecture.md`](docs/decisions/ADR-001-architecture.md)
- **Detailed Setup Guide:** [`docs/development/setup.md`](docs/development/setup.md)
- **Development Roadmap:** [`docs/development/roadmap.md`](docs/development/roadmap.md)
