# Vaultz — Development Roadmap

This document tracks the development milestones for Vaultz. Milestones are marked **Completed** only after implementation and automated verification have succeeded.

---

## Milestone Sequence

| # | Milestone | Status | Summary |
| :- | :--- | :--- | :--- |
| **1** | **Project Foundation** | **Completed** | AI agent harness (`.agent/`, `AGENTS.md`, `docs/`), Next.js frontend shell (`apps/web`), .NET 10 Clean + Vertical Slice backend foundation (`apps/api`), Docker PostgreSQL setup, and test suites. |
| **2** | **Authentication & User Management** | **Completed** | ASP.NET Core Identity (`ApplicationUser`), `HttpOnly` cookie session authentication, `/api/v1/auth/{register,login,logout,me}`, `ICurrentUserService`, and `/login` + `/register` screens. |
| **3** | **Account Management** | **Completed** | Create, list, and update user-owned financial accounts (`Checking`, `Savings`, `Cash`, `CreditCard`, `Investment`) with explicit ISO 4217 currency codes and `numeric(19,4)` balances. |
| **4** | **Transactions (Income, Expenses, Transfers)** | **Completed** | Record, filter, update, and delete income, expense, and same-currency account-to-account transfers with atomic balance reconciliation (`ExecuteInTransactionAsync`). |
| **5** | **Categories** | **Completed** | Default seeded categories on registration plus user-scoped income/expense category creation and deletion (`/api/v1/categories`). |
| **6** | **Budget Management** | **Completed** | Monthly (`YYYY-MM`) category budgets with live utilization calculations that strictly exclude transfers and income (`/api/v1/budgets`). |
| **7** | **Dashboard & Analytics** | **Completed** | Multi-currency net worth, monthly income/expense/transfer summaries, budget pacing, and recent transactions (`/api/v1/dashboard`). |
| **8** | **Savings Goals** | **Completed** | Target savings amounts, target dates, progress tracking, and instant contributions/withdrawals (`/api/v1/savings-goals`). |
| **9** | **Recurring Transactions** | **Completed** | Scheduled recurring templates (`Daily`, `Weekly`, `Monthly`, `Yearly`) with one-click atomic posting that creates the transaction, updates balances, and advances `NextOccurrenceDate`. |
| **10** | **Financial Reports & Exports** | **Completed** | Custom date-range cash-flow reports, category percentage breakdowns, savings rate calculation, and CSV export (`/api/v1/reports/cash-flow` and `/api/v1/reports/transactions.csv`). |
