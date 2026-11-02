using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using Vaultz.Application.Features.Accounts;
using Vaultz.Application.Features.Auth;
using Vaultz.Application.Features.Budgets;
using Vaultz.Application.Features.Categories;
using Vaultz.Application.Features.Dashboard;
using Vaultz.Application.Features.Lending;
using Vaultz.Application.Features.Notifications;
using Vaultz.Application.Features.RecurringTransactions;
using Vaultz.Application.Features.Reports;
using Vaultz.Application.Features.SavingsGoals;
using Vaultz.Application.Features.System.GetSystemStatus;
using Vaultz.Application.Features.Transactions;

namespace Vaultz.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly);

        services.AddScoped<GetSystemStatusHandler>();
        services.AddScoped<AuthHandlers>();
        services.AddScoped<AccountHandlers>();
        services.AddScoped<CategoryHandlers>();
        services.AddScoped<TransactionHandlers>();
        services.AddScoped<BudgetHandlers>();
        services.AddScoped<SavingsGoalHandlers>();
        services.AddScoped<LendingHandlers>();
        services.AddScoped<RecurringTransactionHandlers>();
        services.AddScoped<DashboardHandlers>();
        services.AddScoped<NotificationHandlers>();
        services.AddScoped<ReportHandlers>();

        return services;
    }
}
