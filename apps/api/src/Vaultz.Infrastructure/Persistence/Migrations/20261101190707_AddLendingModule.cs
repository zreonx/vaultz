using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Vaultz.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddLendingModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ux_budgets_user_period_category_currency",
                table: "budgets");

            migrationBuilder.AddColumn<decimal>(
                name: "destination_amount",
                table: "transactions",
                type: "numeric(19,4)",
                precision: 19,
                scale: 4,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "destination_currency_code",
                table: "transactions",
                type: "character(3)",
                fixedLength: true,
                maxLength: 3,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "exchange_rate",
                table: "transactions",
                type: "numeric(19,6)",
                precision: 19,
                scale: 6,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "account_id",
                table: "savings_goals",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "account_id",
                table: "categories",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "account_id",
                table: "budgets",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_default",
                table: "accounts",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "lending_records",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    account_id = table.Column<Guid>(type: "uuid", nullable: false),
                    type = table.Column<int>(type: "integer", nullable: false),
                    counterparty = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    original_amount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    remaining_amount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    currency_code = table.Column<string>(type: "character(3)", fixedLength: true, maxLength: 3, nullable: false),
                    due_date = table.Column<DateOnly>(type: "date", nullable: true),
                    notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    status = table.Column<int>(type: "integer", nullable: false),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    user_id = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lending_records", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "lending_payments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    lending_record_id = table.Column<Guid>(type: "uuid", nullable: false),
                    amount = table.Column<decimal>(type: "numeric(19,4)", precision: 19, scale: 4, nullable: false),
                    currency_code = table.Column<string>(type: "character(3)", fixedLength: true, maxLength: 3, nullable: false),
                    occurred_on = table.Column<DateOnly>(type: "date", nullable: false),
                    notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    created_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at_utc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lending_payments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_lending_payments_lending_records_lending_record_id",
                        column: x => x.lending_record_id,
                        principalTable: "lending_records",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_savings_goals_user_id_account_id",
                table: "savings_goals",
                columns: new[] { "user_id", "account_id" });

            migrationBuilder.CreateIndex(
                name: "ix_categories_user_id_account_id",
                table: "categories",
                columns: new[] { "user_id", "account_id" });

            migrationBuilder.CreateIndex(
                name: "ux_budgets_user_period_category_account_currency",
                table: "budgets",
                columns: new[] { "user_id", "year", "month", "category_id", "account_id", "currency_code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_accounts_user_id_is_default",
                table: "accounts",
                columns: new[] { "user_id", "is_default" });

            migrationBuilder.CreateIndex(
                name: "ix_lending_payments_lending_record_id",
                table: "lending_payments",
                column: "lending_record_id");

            migrationBuilder.CreateIndex(
                name: "ix_lending_records_user_id_account_id",
                table: "lending_records",
                columns: new[] { "user_id", "account_id" });

            migrationBuilder.CreateIndex(
                name: "ix_lending_records_user_id_status",
                table: "lending_records",
                columns: new[] { "user_id", "status" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "lending_payments");

            migrationBuilder.DropTable(
                name: "lending_records");

            migrationBuilder.DropIndex(
                name: "ix_savings_goals_user_id_account_id",
                table: "savings_goals");

            migrationBuilder.DropIndex(
                name: "ix_categories_user_id_account_id",
                table: "categories");

            migrationBuilder.DropIndex(
                name: "ux_budgets_user_period_category_account_currency",
                table: "budgets");

            migrationBuilder.DropIndex(
                name: "ix_accounts_user_id_is_default",
                table: "accounts");

            migrationBuilder.DropColumn(
                name: "destination_amount",
                table: "transactions");

            migrationBuilder.DropColumn(
                name: "destination_currency_code",
                table: "transactions");

            migrationBuilder.DropColumn(
                name: "exchange_rate",
                table: "transactions");

            migrationBuilder.DropColumn(
                name: "account_id",
                table: "savings_goals");

            migrationBuilder.DropColumn(
                name: "account_id",
                table: "categories");

            migrationBuilder.DropColumn(
                name: "account_id",
                table: "budgets");

            migrationBuilder.DropColumn(
                name: "is_default",
                table: "accounts");

            migrationBuilder.CreateIndex(
                name: "ux_budgets_user_period_category_currency",
                table: "budgets",
                columns: new[] { "user_id", "year", "month", "category_id", "currency_code" },
                unique: true);
        }
    }
}
