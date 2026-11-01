# Database and Financial Rules

Vaultz manages personal financial records where precision, auditability, and multi-tenant user isolation are critical requirements.

---

## 1. Database Engine & ORM

- **Database:** PostgreSQL (managed via EF Core and `Npgsql.EntityFrameworkCore.PostgreSQL`).
- **Configuration:** All entity mappings must use explicit `IEntityTypeConfiguration<T>` classes in `Vaultz.Infrastructure/Persistence/Configurations/`. Do not rely on data annotations in `Vaultz.Domain`.
- **Naming Conventions:** Use `snake_case` for PostgreSQL table names, column names, constraints, and indexes (or explicit mapping in configurations).

---

## 2. Monetary Precision & Currency Rules

1. **No Floating-Point Money:**
   - **Never** use `float` or `double` in C# or `real` / `double precision` in PostgreSQL for monetary amounts, exchange rates, or budget limits.
   - Always use `decimal` in C# and `numeric(19, 4)` in PostgreSQL.
2. **Explicit Currency Storage:**
   - Every monetary record (Account, Transaction, Budget, Savings Goal) must store an explicit 3-letter ISO 4217 currency code (`varchar(3)`, uppercase, e.g., `USD`, `EUR`, `PHP`).
   - Never assume an implicit default currency in calculations; operations across accounts must verify currency compatibility.
3. **Deliberate Rounding:**
   - Define rounding explicitly (`MidpointRounding.ToEven` or currency-specific minor unit scale) at well-defined calculation boundaries rather than relying on implicit truncation.

---

## 3. Timestamps & Financial Dates

- **System Audit Timestamps:** Store `CreatedAtUtc` and `UpdatedAtUtc` as UTC `timestamp with time zone` (`timestamptz` in PostgreSQL / `DateTimeOffset` in C#).
- **Financial Event / Period Dates:** Preserve calendar date semantics (`DateOnly` / PostgreSQL `date`) for budget periods, statement dates, or transaction booking dates where timezone shifts must not move a transaction into a different day or month.

---

## 4. Multi-User Data Isolation

- Every user-owned table (`accounts`, `transactions`, `categories`, `budgets`, `savings_goals`, `recurring_transactions`) must include a non-nullable `user_id` column indexed with composite indexes (e.g., `(user_id, occurred_on)`).
- Queries must **always** filter by the authenticated `UserId`.
- Related entity references (e.g., assigning a `CategoryId` or `AccountId` to a Transaction) must verify that both the parent and referenced records belong to the same `UserId`.

---

## 5. Financial Domain Invariants

- **Transfers Are Not Income or Expense:**
  - Account-to-account transfers represent movement of funds between two user-owned accounts.
  - Transfers must be excluded from income/expense totals in cash-flow reports and budget spending calculations.
- **Single Balance Update Guarantee:**
  - Account balances must never be updated twice for the same transaction.
  - Any operation that modifies both a transaction record and an account balance (or two accounts in a transfer) must execute inside an atomic database transaction.
- **Edits, Reversals, and Deletions:**
  - Mutating or deleting a recorded transaction must deterministically reconcile affected account balances within the same database transaction.
