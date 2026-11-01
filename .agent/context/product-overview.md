# Vaultz — Product Overview

## 1. Vision and Purpose

**Vaultz** is a multi-user Personal Finance Management application designed to give individuals accurate, clear, and trustworthy control over their financial lives. Unlike simplified expense trackers that rely on imprecise floating-point math or conflate account transfers with spending, Vaultz treats personal finance data with accounting-grade discipline while remaining approachable for everyday budgeting.

---

## 2. Core Functional Domains

Vaultz is organized around nine core capabilities (introduced incrementally across planned milestones):

1. **Accounts**
   - Track checking, savings, cash, credit card, and investment accounts.
   - Maintain accurate balances per account with explicit ISO 4217 currency codes.
2. **Income & Expenses (Transactions)**
   - Record inflows and outflows linked to an account and optional category.
   - Support deterministic edits, reversals, and deletions that keep account balances consistent.
3. **Transfers**
   - Record movement of money between two user-owned accounts.
   - Never treat transfers as ordinary income or expense in cash-flow summaries or budget progress.
4. **Categories**
   - Organize income and expense transactions into customizable, user-scoped categories.
5. **Budgets**
   - Set periodic spending targets by category and monitor real-time utilization against actual expenses.
6. **Savings Goals**
   - Define target amounts and target dates for specific financial milestones and track contributions.
7. **Recurring Transactions**
   - Model scheduled bills, subscriptions, and salary deposits.
8. **Financial Reports & Analytics**
   - Provide net worth summaries, income-vs-expense cash flow, category breakdowns, and period-over-period comparisons.
9. **Multi-User Data Isolation**
   - Support multiple independent users on the same deployment with strict tenant isolation—no user may ever view, infer, or mutate another user's financial data.

---

## 3. Current Milestone Scope (v0.1 — Project Foundation)

During **Milestone 1 (Project Initialization)**:
- Establish the AI agent harness (`.agent/`, `AGENTS.md`, `docs/`).
- Initialize the Next.js frontend shell (`apps/web`) with feature-based architecture, Tailwind CSS, shadcn/ui, TanStack Query, React Hook Form, Zod, and a typed API client.
- Initialize the .NET 10 backend (`apps/api`) with Clean Architecture layers (`Domain`, `Application`, `Infrastructure`, `Api`), Vertical Slice structure, EF Core + PostgreSQL configuration, health endpoint, global exception handling, OpenAPI, and xUnit test suites.
- Provide Docker Compose local PostgreSQL infrastructure (`infrastructure/docker/`).
- **Out of Scope for v0.1:** Authentication flows, accounts, transactions, budgets, and speculative database tables.
