# Vaultz — Development Roadmap

This document tracks the development milestones for Vaultz. Milestones are marked **Completed** only after implementation and automated verification have succeeded.

---

## Milestone Sequence

| # | Milestone | Status | Summary |
| :- | :--- | :--- | :--- |
| **1** | **Project Foundation** | **Completed** | Architecture blueprints and technical setup (`docs/`), Next.js frontend shell (`apps/web`), .NET 10 Clean + Vertical Slice backend foundation (`apps/api`), Docker PostgreSQL setup, and test suites. |
| **2** | **Authentication & User Management** | **Completed** | ASP.NET Core Identity (`ApplicationUser`), `HttpOnly` cookie session authentication, `/api/v1/auth/{register,login,logout,me}`, `ICurrentUserService`, and `/login` + `/register` screens. |
| **3** | **Account Management** | **Completed** | Create, list, and update user-owned financial accounts (`Checking`, `Savings`, `Cash`, `CreditCard`, `Investment`) with explicit ISO 4217 currency codes and `numeric(19,4)` balances. |
| **4** | **Transactions (Income, Expenses, Transfers)** | **Completed** | Record, filter, update, and delete income, expense, and same-currency account-to-account transfers with atomic balance reconciliation (`ExecuteInTransactionAsync`). |
| **5** | **Categories** | **Completed** | Default seeded categories on registration plus user-scoped income/expense category creation and deletion (`/api/v1/categories`). |
| **6** | **Budget Management** | **Completed** | Monthly (`YYYY-MM`) category budgets with live utilization calculations that strictly exclude transfers and income (`/api/v1/budgets`). |
| **7** | **Dashboard & Analytics** | **Completed** | Multi-currency net worth, monthly income/expense/transfer summaries, budget pacing, and recent transactions (`/api/v1/dashboard`). |
| **8** | **Savings Goals** | **Completed** | Target savings amounts, target dates, progress tracking, and instant contributions/withdrawals (`/api/v1/savings-goals`). |
| **9** | **Recurring Transactions** | **Completed** | Scheduled recurring templates (`Daily`, `Weekly`, `Monthly`, `Yearly`) with one-click atomic posting that creates the transaction, updates balances, and advances `NextOccurrenceDate`. |
| **10** | **Financial Reports & Exports** | **Completed** | Custom date-range cash-flow reports, category percentage breakdowns, savings rate calculation, and CSV export (`/api/v1/reports/cash-flow` and `/api/v1/reports/transactions.csv`). |
| **11** | **Mobile App & Parity** | **Completed** | React Native Expo mobile application (`apps/mobile`) with full feature parity, gesture sheets, 5-tab navigation, dark/light themes, offline persistence, and live FX integration. |
| **12** | **Productivity & Production Deployment** | **Completed** | Purpose buckets / account allocations, IOUs / lending tracker, Wishlist with 1-tap purchase logging, Quick Notes, Quick Log presets, and live production deployment on RackNerd VPS (`vaultz-api.zreon.space`) + Vercel (`vaultz.zreon.space`). |

---

## Long-Term Roadmap: Business & Freelance Financial Hub

Designed for solopreneurs, digital agencies, and small businesses who need financial clarity without the bloat and expense of legacy enterprise accounting software.

| # | Milestone | Status | Key Deliverables |
| :- | :--- | :--- | :--- |
| **13** | **Business Workspace & Entity Mode** | **Planned** | Dedicated Personal vs. Business workspace toggle with strict data segregation, business registration profile, and separate tax identifiers. |
| **14** | **Invoicing & Accounts Receivable (A/R)** | **Planned** | Clean, minimalist PDF invoice generation, payment status tracking (`Draft`, `Sent`, `Paid`, `Overdue`), and automated income logging on settlement. |
| **15** | **Cash Flow Runway & Burn Rate Analytics** | **Planned** | Real-time business runway calculation (`Cash Reserves ÷ Average Monthly OpEx`), burn rate trend graphs, and safety buffer alerts. |
| **16** | **Profit-First Rules & Tax Withholding** | **Planned** | Automated percentage splits on incoming client deposits into dedicated Tax, Profit, and OpEx purpose buckets; tax-deductible expense tagging. |
| **17** | **Client & Vendor Ledger Insights** | **Planned** | Client lifetime value (LTV), top revenue sources, recurring software/vendor expense tracking, and accountant-ready P&L export. |
