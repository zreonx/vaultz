# Database Design & Financial Modeling Rules

## 1. Confirmed Architectural & Schema Decisions

### 1.1 Database Engine & Persistence Stack
- **RDBMS:** PostgreSQL 17.
- **ORM:** Entity Framework Core 10 (`Npgsql.EntityFrameworkCore.PostgreSQL`) with `VaultzDbContext : DbContext`.
- **Schema Management:** Code-first EF Core migrations stored in `Vaultz.Infrastructure/Persistence/Migrations` (`InitialVaultzSchema`, `AddLendingModule`, `AddProductionSchemaAndQuickLogPresets`, `AddWishlistAndQuickNotes`) with explicit `IEntityTypeConfiguration<T>` classes in `Vaultz.Infrastructure/Persistence/Configurations/EntityConfigurations.cs`. `DatabaseInitializer.InitializeAsync` applies migrations across all environments and baselines legacy pre-history databases.

### 1.2 Core Tables & Indexes
- `users` (`UserAccount`): `id`, `email`, `full_name`, `password_hash` (PBKDF2-SHA256), `default_currency_code` (`char(3)`), email verification & reset tokens, TOTP 2FA fields, lockout & security audit fields (`failed_login_attempts`, `lockout_end_utc`, `last_login_*`, `security_stamp`).
- `accounts` (`FinancialAccount`): `id`, `user_id`, `name`, `type`, `currency_code` (`char(3)`), `balance` (`numeric(19,4)`), `is_archived`, `is_default`, `created_at_utc`, `updated_at_utc`. Indexed on `(user_id, is_archived)` and `(user_id, is_default)`.
- `categories` (`Category`): `id`, `user_id`, `account_id` (nullable FK to `accounts`), `name`, `type`, `color_hex`, `is_archived`, `created_at_utc`, `updated_at_utc`. Indexed on `(user_id, type)` and `(user_id, account_id)`. Null `account_id` indicates global categories available across all accounts.
- `transactions` (`FinancialTransaction`): `id`, `user_id`, `account_id`, `destination_account_id`, `category_id`, `type`, `amount` (`numeric(19,4)`), `currency_code` (`char(3)`), `destination_amount`, `destination_currency_code`, `exchange_rate`, `occurred_on` (`date`), `description`, `notes`, `budget_slice_id`, `account_allocation_id`. Indexed on `(user_id, occurred_on)`, `(user_id, account_id)`, `(user_id, category_id)`, `budget_slice_id`, and `account_allocation_id`.
- `account_allocations` (`AccountAllocation`): `id`, `user_id`, `account_id`, `name`, `category`, `balance` (`numeric(19,4)`), `target_amount` (`numeric(19,4)`), `color`, `icon`, `is_archived`. Protected purpose vaults partitioned inside an account.
- `monthly_budget_plans` & `monthly_budget_slices` (`MonthlyBudgetPlan`, `MonthlyBudgetSlice`): Account-scoped monthly percentage/amount spending slices that serve as Vaultz's primary budgeting engine (replacing the deprecated `budgets` endpoint).
- `quick_log_presets` (`QuickLogPreset`): `id`, `user_id`, `account_id`, `label`, `amount` (`numeric(19,4)`), `currency_code` (`char(3)`), `type` (`Expense` or `Income`), `category_id`, `budget_slice_id`, `icon`, `color_hex`, `sort_order`. Max 6 customizable 1-tap presets per account; indexed on `(user_id, account_id, sort_order)`.
- `budgets` (`Budget` — deprecated): Legacy `YYYY-MM` category caps retained for API backwards compatibility (`/api/v1/budgets` emits RFC 8594 deprecation headers); consolidated into Monthly Finance slices.
- `lending_records` & `lending_payments` (`LendingRecord`, `LendingPayment`): Account-scoped personal lending/borrowing (IOU) records and repayment ledger.
- `notifications` (`Notification`): Per-user real-time security, transfer, and Monthly Finance budget alerts.
- `savings_goals` (`SavingsGoal`): `id`, `user_id`, `account_id` (nullable FK to `accounts`), `name`, `target_amount` (`numeric(19,4)`), `current_amount` (`numeric(19,4)`), `currency_code` (`char(3)`), `target_date` (`date`). Indexed on `(user_id)` and `(user_id, account_id)`.
- `recurring_transactions` (`RecurringTransaction`): `id`, `user_id`, `account_id`, `destination_account_id`, `category_id`, `type`, `amount` (`numeric(19,4)`), `currency_code` (`char(3)`), `description`, `frequency`, `next_occurrence_date` (`date`), `last_processed_date` (`date`), `is_active`. Indexed on `(user_id, next_occurrence_date)` and `(user_id, account_id)`.
- `wishlist_items` (`WishlistItem`): `id`, `user_id`, `account_id` (nullable), `category_id` (nullable), `name`, `estimated_price` (`numeric(19,4)`), `currency_code` (`char(3)`), `priority` (`Low=1`, `Medium=2`, `High=3`), `status` (`Wanted=1`, `Purchased=2`, `Archived=3`), `target_date` (`date`), `url`, `notes`, `purchased_at_utc`, `purchased_transaction_id`. Indexed on `(user_id, status)` and `(user_id, account_id)`.
- `quick_notes` (`QuickNote`): `id`, `user_id`, `account_id` (nullable), `title`, `content`, `color_hex` (`#RRGGBB`), `is_pinned`, `is_archived`, `created_at_utc`, `updated_at_utc`. Indexed on `(user_id, is_pinned, is_archived)` and `(user_id, account_id)`.

### 1.3 Confirmed Financial Invariants
1. **Monetary Precision & Explicit Currency:** All monetary fields use `decimal` in C# and `numeric(19,4)` in PostgreSQL alongside an explicit 3-letter uppercase ISO 4217 `currency_code`.
2. **Account Isolation & Scoped Tracking:** Each account operates as an independent financial silo with its own fixed currency. When an account is active, transactions, categories, budgets, savings goals, recurring schedules, and cash-flow reports are scoped to that account's activity without cross-contamination.
3. **Cross-Currency & Same-Currency Transfers:** Transfers explicitly record source and destination accounts. Cross-currency transfers record exchange rates and destination amounts without skewing budget expenses or income reports.
4. **Physical Deletion with Atomic Balance Reversal:** Deleting or updating a transaction executes inside an atomic database transaction (`ExecuteInTransactionAsync`) that reverses the previous balance impact on the affected account(s) before removing or updating the row.
5. **Monthly Calendar Budgets (`YYYY-MM`):** Budgets are defined per expense category, calendar year/month, currency code, and optional account. When linked to an account, progress is computed exclusively from that account's expenses.
