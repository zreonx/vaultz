# Database Design & Financial Modeling Rules

## 1. Confirmed Architectural & Schema Decisions

### 1.1 Database Engine & Persistence Stack
- **RDBMS:** PostgreSQL 17.
- **ORM:** Entity Framework Core 10 (`Npgsql.EntityFrameworkCore.PostgreSQL`) with `VaultzDbContext : DbContext`.
- **Schema Management:** Code-first EF Core migrations stored in `Vaultz.Infrastructure/Persistence/Migrations` (`InitialVaultzSchema`) with explicit `IEntityTypeConfiguration<T>` classes in `Vaultz.Infrastructure/Persistence/Configurations/EntityConfigurations.cs`.

### 1.2 Core Tables & Indexes
- `users` (`UserAccount`): `id`, `email`, `normalized_email` (unique index), `full_name`, `password_hash` (PBKDF2-SHA256), `default_currency_code` (`char(3)`), `created_at_utc`, `updated_at_utc`.
- `accounts` (`FinancialAccount`): `id`, `user_id`, `name`, `type`, `currency_code` (`char(3)`), `balance` (`numeric(19,4)`), `is_archived`, `created_at_utc`, `updated_at_utc`. Indexed on `(user_id, is_archived)`.
- `categories` (`Category`): `id`, `user_id`, `account_id` (nullable FK to `accounts`), `name`, `type`, `color_hex`, `is_archived`, `created_at_utc`, `updated_at_utc`. Indexed on `(user_id, type)` and `(user_id, account_id)`. Null `account_id` indicates global categories available across all accounts.
- `transactions` (`FinancialTransaction`): `id`, `user_id`, `account_id`, `destination_account_id`, `category_id`, `type`, `amount` (`numeric(19,4)`), `currency_code` (`char(3)`), `occurred_on` (`date`), `description`, `notes`, `created_at_utc`, `updated_at_utc`. Indexed on `(user_id, occurred_on)`, `(user_id, account_id)`, and `(user_id, category_id)`.
- `budgets` (`Budget`): `id`, `user_id`, `account_id` (nullable FK to `accounts`), `category_id`, `year`, `month`, `limit_amount` (`numeric(19,4)`), `currency_code` (`char(3)`). Unique index on `(user_id, year, month, category_id, account_id, currency_code)`. Scopes spending progress strictly to transactions of the matching account when `account_id` is specified.
- `savings_goals` (`SavingsGoal`): `id`, `user_id`, `account_id` (nullable FK to `accounts`), `name`, `target_amount` (`numeric(19,4)`), `current_amount` (`numeric(19,4)`), `currency_code` (`char(3)`), `target_date` (`date`). Indexed on `(user_id)` and `(user_id, account_id)`.
- `recurring_transactions` (`RecurringTransaction`): `id`, `user_id`, `account_id`, `destination_account_id`, `category_id`, `type`, `amount` (`numeric(19,4)`), `currency_code` (`char(3)`), `description`, `frequency`, `next_occurrence_date` (`date`), `last_processed_date` (`date`), `is_active`. Indexed on `(user_id, next_occurrence_date)` and `(user_id, account_id)`.

### 1.3 Confirmed Financial Invariants
1. **Monetary Precision & Explicit Currency:** All monetary fields use `decimal` in C# and `numeric(19,4)` in PostgreSQL alongside an explicit 3-letter uppercase ISO 4217 `currency_code`.
2. **Account Isolation & Scoped Tracking:** Each account operates as an independent financial silo with its own fixed currency. When an account is active, transactions, categories, budgets, savings goals, recurring schedules, and cash-flow reports are scoped to that account's activity without cross-contamination.
3. **Cross-Currency & Same-Currency Transfers:** Transfers explicitly record source and destination accounts. Cross-currency transfers record exchange rates and destination amounts without skewing budget expenses or income reports.
4. **Physical Deletion with Atomic Balance Reversal:** Deleting or updating a transaction executes inside an atomic database transaction (`ExecuteInTransactionAsync`) that reverses the previous balance impact on the affected account(s) before removing or updating the row.
5. **Monthly Calendar Budgets (`YYYY-MM`):** Budgets are defined per expense category, calendar year/month, currency code, and optional account. When linked to an account, progress is computed exclusively from that account's expenses.
