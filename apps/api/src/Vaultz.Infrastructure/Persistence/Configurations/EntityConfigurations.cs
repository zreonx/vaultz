using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Vaultz.Domain.Entities;

namespace Vaultz.Infrastructure.Persistence.Configurations;

public sealed class UserAccountConfiguration : IEntityTypeConfiguration<UserAccount>
{
    public void Configure(EntityTypeBuilder<UserAccount> builder)
    {
        builder.ToTable("users");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.Email).HasColumnName("email").HasMaxLength(256).IsRequired();
        builder.Property(x => x.FullName).HasColumnName("full_name").HasMaxLength(100).IsRequired();
        builder.Property(x => x.PasswordHash).HasColumnName("password_hash").HasMaxLength(512).IsRequired();
        builder.Property(x => x.DefaultCurrencyCode).HasColumnName("default_currency_code").HasMaxLength(3).IsFixedLength().IsRequired();
        builder.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc").IsRequired();
        builder.Property(x => x.UpdatedAtUtc).HasColumnName("updated_at_utc");

        builder.Property(x => x.IsEmailVerified).HasColumnName("is_email_verified").HasDefaultValue(false).IsRequired();
        builder.Property(x => x.EmailVerificationToken).HasColumnName("email_verification_token").HasMaxLength(256);
        builder.Property(x => x.EmailVerificationTokenExpiresAtUtc).HasColumnName("email_verification_token_expires_at_utc");

        builder.Property(x => x.PasswordResetToken).HasColumnName("password_reset_token").HasMaxLength(256);
        builder.Property(x => x.PasswordResetTokenExpiresAtUtc).HasColumnName("password_reset_token_expires_at_utc");

        builder.Property(x => x.TwoFactorEnabled).HasColumnName("two_factor_enabled").HasDefaultValue(false).IsRequired();
        builder.Property(x => x.TwoFactorType).HasColumnName("two_factor_type").HasDefaultValue(Vaultz.Domain.Enums.TwoFactorType.None).IsRequired();
        builder.Property(x => x.TwoFactorSecret).HasColumnName("two_factor_secret").HasMaxLength(256);
        builder.Property(x => x.TwoFactorOtpCode).HasColumnName("two_factor_otp_code").HasMaxLength(16);
        builder.Property(x => x.TwoFactorOtpExpiresAtUtc).HasColumnName("two_factor_otp_expires_at_utc");
        builder.Property(x => x.TwoFactorRecoveryCodes).HasColumnName("two_factor_recovery_codes");

        builder.Property(x => x.FailedLoginAttempts).HasColumnName("failed_login_attempts").HasDefaultValue(0).IsRequired();
        builder.Property(x => x.LockoutEndUtc).HasColumnName("lockout_end_utc");

        builder.Property(x => x.LastLoginAtUtc).HasColumnName("last_login_at_utc");
        builder.Property(x => x.LastLoginIp).HasColumnName("last_login_ip").HasMaxLength(64);
        builder.Property(x => x.LastLoginUserAgent).HasColumnName("last_login_user_agent").HasMaxLength(512);
        builder.Property(x => x.SecurityStamp).HasColumnName("security_stamp").HasMaxLength(64).IsRequired();

        builder.HasIndex(x => x.Email).IsUnique().HasDatabaseName("ux_users_email");
    }
}

public sealed class FinancialAccountConfiguration : IEntityTypeConfiguration<FinancialAccount>
{
    public void Configure(EntityTypeBuilder<FinancialAccount> builder)
    {
        builder.ToTable("accounts");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.UserId).HasColumnName("user_id").HasMaxLength(128).IsRequired();
        builder.Property(x => x.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
        builder.Property(x => x.Type).HasColumnName("type").IsRequired();
        builder.Property(x => x.CurrencyCode).HasColumnName("currency_code").HasMaxLength(3).IsFixedLength().IsRequired();
        builder.Property(x => x.Balance).HasColumnName("balance").HasPrecision(19, 4).IsRequired();
        builder.Property(x => x.IsArchived).HasColumnName("is_archived").IsRequired();
        builder.Property(x => x.IsDefault).HasColumnName("is_default").HasDefaultValue(false).IsRequired();
        builder.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc").IsRequired();
        builder.Property(x => x.UpdatedAtUtc).HasColumnName("updated_at_utc");

        builder.HasIndex(x => new { x.UserId, x.IsArchived }).HasDatabaseName("ix_accounts_user_id_is_archived");
        builder.HasIndex(x => new { x.UserId, x.IsDefault }).HasDatabaseName("ix_accounts_user_id_is_default");
    }
}

public sealed class CategoryConfiguration : IEntityTypeConfiguration<Category>
{
    public void Configure(EntityTypeBuilder<Category> builder)
    {
        builder.ToTable("categories");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.UserId).HasColumnName("user_id").HasMaxLength(128).IsRequired();
        builder.Property(x => x.AccountId).HasColumnName("account_id");
        builder.Property(x => x.Name).HasColumnName("name").HasMaxLength(80).IsRequired();
        builder.Property(x => x.Type).HasColumnName("type").IsRequired();
        builder.Property(x => x.ColorHex).HasColumnName("color_hex").HasMaxLength(7).IsRequired();
        builder.Property(x => x.IsArchived).HasColumnName("is_archived").IsRequired();
        builder.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc").IsRequired();
        builder.Property(x => x.UpdatedAtUtc).HasColumnName("updated_at_utc");

        builder.HasIndex(x => new { x.UserId, x.Type }).HasDatabaseName("ix_categories_user_id_type");
        builder.HasIndex(x => new { x.UserId, x.AccountId }).HasDatabaseName("ix_categories_user_id_account_id");
    }
}

public sealed class FinancialTransactionConfiguration : IEntityTypeConfiguration<FinancialTransaction>
{
    public void Configure(EntityTypeBuilder<FinancialTransaction> builder)
    {
        builder.ToTable("transactions");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.UserId).HasColumnName("user_id").HasMaxLength(128).IsRequired();
        builder.Property(x => x.AccountId).HasColumnName("account_id").IsRequired();
        builder.Property(x => x.DestinationAccountId).HasColumnName("destination_account_id");
        builder.Property(x => x.CategoryId).HasColumnName("category_id");
        builder.Property(x => x.Type).HasColumnName("type").IsRequired();
        builder.Property(x => x.Amount).HasColumnName("amount").HasPrecision(19, 4).IsRequired();
        builder.Property(x => x.CurrencyCode).HasColumnName("currency_code").HasMaxLength(3).IsFixedLength().IsRequired();
        builder.Property(x => x.DestinationAmount).HasColumnName("destination_amount").HasPrecision(19, 4);
        builder.Property(x => x.DestinationCurrencyCode).HasColumnName("destination_currency_code").HasMaxLength(3).IsFixedLength();
        builder.Property(x => x.ExchangeRate).HasColumnName("exchange_rate").HasPrecision(19, 6);
        builder.Property(x => x.OccurredOn).HasColumnName("occurred_on").IsRequired();
        builder.Property(x => x.Description).HasColumnName("description").HasMaxLength(200).IsRequired();
        builder.Property(x => x.Notes).HasColumnName("notes").HasMaxLength(500);
        builder.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc").IsRequired();
        builder.Property(x => x.UpdatedAtUtc).HasColumnName("updated_at_utc");

        builder.HasIndex(x => new { x.UserId, x.OccurredOn }).HasDatabaseName("ix_transactions_user_id_occurred_on");
        builder.HasIndex(x => new { x.UserId, x.AccountId }).HasDatabaseName("ix_transactions_user_id_account_id");
        builder.HasIndex(x => new { x.UserId, x.CategoryId }).HasDatabaseName("ix_transactions_user_id_category_id");
    }
}

public sealed class BudgetConfiguration : IEntityTypeConfiguration<Budget>
{
    public void Configure(EntityTypeBuilder<Budget> builder)
    {
        builder.ToTable("budgets");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.UserId).HasColumnName("user_id").HasMaxLength(128).IsRequired();
        builder.Property(x => x.AccountId).HasColumnName("account_id");
        builder.Property(x => x.CategoryId).HasColumnName("category_id").IsRequired();
        builder.Property(x => x.Year).HasColumnName("year").IsRequired();
        builder.Property(x => x.Month).HasColumnName("month").IsRequired();
        builder.Property(x => x.LimitAmount).HasColumnName("limit_amount").HasPrecision(19, 4).IsRequired();
        builder.Property(x => x.CurrencyCode).HasColumnName("currency_code").HasMaxLength(3).IsFixedLength().IsRequired();
        builder.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc").IsRequired();
        builder.Property(x => x.UpdatedAtUtc).HasColumnName("updated_at_utc");

        builder.HasIndex(x => new { x.UserId, x.Year, x.Month, x.CategoryId, x.AccountId, x.CurrencyCode })
            .IsUnique()
            .HasDatabaseName("ux_budgets_user_period_category_account_currency");
    }
}

public sealed class SavingsGoalConfiguration : IEntityTypeConfiguration<SavingsGoal>
{
    public void Configure(EntityTypeBuilder<SavingsGoal> builder)
    {
        builder.ToTable("savings_goals");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.UserId).HasColumnName("user_id").HasMaxLength(128).IsRequired();
        builder.Property(x => x.AccountId).HasColumnName("account_id");
        builder.Property(x => x.Name).HasColumnName("name").HasMaxLength(100).IsRequired();
        builder.Property(x => x.TargetAmount).HasColumnName("target_amount").HasPrecision(19, 4).IsRequired();
        builder.Property(x => x.CurrentAmount).HasColumnName("current_amount").HasPrecision(19, 4).IsRequired();
        builder.Property(x => x.CurrencyCode).HasColumnName("currency_code").HasMaxLength(3).IsFixedLength().IsRequired();
        builder.Property(x => x.TargetDate).HasColumnName("target_date");
        builder.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc").IsRequired();
        builder.Property(x => x.UpdatedAtUtc).HasColumnName("updated_at_utc");

        builder.HasIndex(x => x.UserId).HasDatabaseName("ix_savings_goals_user_id");
        builder.HasIndex(x => new { x.UserId, x.AccountId }).HasDatabaseName("ix_savings_goals_user_id_account_id");
    }
}

public sealed class RecurringTransactionConfiguration : IEntityTypeConfiguration<RecurringTransaction>
{
    public void Configure(EntityTypeBuilder<RecurringTransaction> builder)
    {
        builder.ToTable("recurring_transactions");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.UserId).HasColumnName("user_id").HasMaxLength(128).IsRequired();
        builder.Property(x => x.AccountId).HasColumnName("account_id").IsRequired();
        builder.Property(x => x.DestinationAccountId).HasColumnName("destination_account_id");
        builder.Property(x => x.CategoryId).HasColumnName("category_id");
        builder.Property(x => x.Type).HasColumnName("type").IsRequired();
        builder.Property(x => x.Amount).HasColumnName("amount").HasPrecision(19, 4).IsRequired();
        builder.Property(x => x.CurrencyCode).HasColumnName("currency_code").HasMaxLength(3).IsFixedLength().IsRequired();
        builder.Property(x => x.Description).HasColumnName("description").HasMaxLength(200).IsRequired();
        builder.Property(x => x.Frequency).HasColumnName("frequency").IsRequired();
        builder.Property(x => x.NextOccurrenceDate).HasColumnName("next_occurrence_date").IsRequired();
        builder.Property(x => x.LastProcessedDate).HasColumnName("last_processed_date");
        builder.Property(x => x.IsActive).HasColumnName("is_active").IsRequired();
        builder.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc").IsRequired();
        builder.Property(x => x.UpdatedAtUtc).HasColumnName("updated_at_utc");

        builder.HasIndex(x => new { x.UserId, x.NextOccurrenceDate }).HasDatabaseName("ix_recurring_transactions_user_id_next_date");
    }
}

public sealed class LendingRecordConfiguration : IEntityTypeConfiguration<LendingRecord>
{
    public void Configure(EntityTypeBuilder<LendingRecord> builder)
    {
        builder.ToTable("lending_records");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.UserId).HasColumnName("user_id").HasMaxLength(128).IsRequired();
        builder.Property(x => x.AccountId).HasColumnName("account_id").IsRequired();
        builder.Property(x => x.Type).HasColumnName("type").IsRequired();
        builder.Property(x => x.Counterparty).HasColumnName("counterparty").HasMaxLength(100).IsRequired();
        builder.Property(x => x.OriginalAmount).HasColumnName("original_amount").HasPrecision(19, 4).IsRequired();
        builder.Property(x => x.RemainingAmount).HasColumnName("remaining_amount").HasPrecision(19, 4).IsRequired();
        builder.Property(x => x.CurrencyCode).HasColumnName("currency_code").HasMaxLength(3).IsFixedLength().IsRequired();
        builder.Property(x => x.DueDate).HasColumnName("due_date");
        builder.Property(x => x.Notes).HasColumnName("notes").HasMaxLength(500);
        builder.Property(x => x.Status).HasColumnName("status").IsRequired();
        builder.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc").IsRequired();
        builder.Property(x => x.UpdatedAtUtc).HasColumnName("updated_at_utc");

        builder.HasMany(x => x.Payments)
            .WithOne()
            .HasForeignKey(x => x.LendingRecordId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(x => new { x.UserId, x.AccountId }).HasDatabaseName("ix_lending_records_user_id_account_id");
        builder.HasIndex(x => new { x.UserId, x.Status }).HasDatabaseName("ix_lending_records_user_id_status");
    }
}

public sealed class LendingPaymentConfiguration : IEntityTypeConfiguration<LendingPayment>
{
    public void Configure(EntityTypeBuilder<LendingPayment> builder)
    {
        builder.ToTable("lending_payments");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.LendingRecordId).HasColumnName("lending_record_id").IsRequired();
        builder.Property(x => x.Amount).HasColumnName("amount").HasPrecision(19, 4).IsRequired();
        builder.Property(x => x.CurrencyCode).HasColumnName("currency_code").HasMaxLength(3).IsFixedLength().IsRequired();
        builder.Property(x => x.OccurredOn).HasColumnName("occurred_on").IsRequired();
        builder.Property(x => x.Notes).HasColumnName("notes").HasMaxLength(500);
        builder.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc").IsRequired();
        builder.Property(x => x.UpdatedAtUtc).HasColumnName("updated_at_utc");

        builder.HasIndex(x => x.LendingRecordId).HasDatabaseName("ix_lending_payments_lending_record_id");
    }
}

public sealed class NotificationConfiguration : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> builder)
    {
        builder.ToTable("notifications");
        builder.HasKey(x => x.Id);

        builder.Property(x => x.UserId).HasColumnName("user_id").HasMaxLength(128).IsRequired();
        builder.Property(x => x.Title).HasColumnName("title").HasMaxLength(150).IsRequired();
        builder.Property(x => x.Message).HasColumnName("message").HasMaxLength(1000).IsRequired();
        builder.Property(x => x.Type).HasColumnName("type").IsRequired();
        builder.Property(x => x.IsRead).HasColumnName("is_read").IsRequired();
        builder.Property(x => x.ReadAtUtc).HasColumnName("read_at_utc");
        builder.Property(x => x.ActionUrl).HasColumnName("action_url").HasMaxLength(300);
        builder.Property(x => x.CreatedAtUtc).HasColumnName("created_at_utc").IsRequired();
        builder.Property(x => x.UpdatedAtUtc).HasColumnName("updated_at_utc");

        builder.HasIndex(x => new { x.UserId, x.IsRead }).HasDatabaseName("ix_notifications_user_id_is_read");
        builder.HasIndex(x => new { x.UserId, x.CreatedAtUtc }).HasDatabaseName("ix_notifications_user_id_created_at_utc");
    }
}
