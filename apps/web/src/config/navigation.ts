export interface NavItem {
  title: string;
  href: string;
  status: "active" | "planned";
  description: string;
  scope?: "portfolio" | "account" | "system" | "shared";
}

/**
 * Portfolio-wide features that show all accounts across the entire portfolio.
 */
export const ALL_ACCOUNTS_NAVIGATION: NavItem[] = [
  {
    title: "Overview",
    href: "/dashboard",
    status: "active",
    description: "Net worth, monthly cash flow & financial pacing",
    scope: "portfolio",
  },
  {
    title: "Accounts",
    href: "/accounts",
    status: "active",
    description: "Checking, savings, cash & credit card balances",
    scope: "portfolio",
  },
  {
    title: "Monthly Finance",
    href: "/budgets",
    status: "active",
    description: "Funds partition, purpose vaults & monthly allowance slices",
    scope: "portfolio",
  },
  {
    title: "Transaction History",
    href: "/transactions",
    status: "active",
    description: "Combined transaction history across all accounts",
    scope: "portfolio",
  },
  {
    title: "Reports",
    href: "/reports",
    status: "active",
    description: "Cash flow insights, category breakdowns & exports",
    scope: "portfolio",
  },
];

/** Backwards-compatible alias */
export const SHARED_NAVIGATION = ALL_ACCOUNTS_NAVIGATION;

/**
 * Independent features scoped specifically to the currently selected active account.
 */
export const ACCOUNT_NAVIGATION: NavItem[] = [
  {
    title: "Monthly Finance",
    href: "/budgets",
    status: "active",
    description: "Funds partition, purpose vaults & monthly allowance slices",
    scope: "account",
  },
  {
    title: "Savings Goals",
    href: "/savings",
    status: "active",
    description: "Target milestones & dedicated savings",
    scope: "account",
  },
  {
    title: "IOUs",
    href: "/lending",
    status: "active",
    description: "Personal lending, borrowing & repayment tracking",
    scope: "account",
  },
  {
    title: "Recurring",
    href: "/recurring",
    status: "active",
    description: "Scheduled bills, subscriptions & regular income",
    scope: "account",
  },
  {
    title: "Categories",
    href: "/categories",
    status: "active",
    description: "Custom income & spending categories",
    scope: "account",
  },
];

/**
 * System-level preferences and security controls.
 */
export const SYSTEM_NAVIGATION: NavItem[] = [
  {
    title: "Calculators & Tools",
    href: "/tools",
    status: "active",
    description: "Currency converter, arithmetic & loan calculators",
    scope: "system",
  },
  {
    title: "Settings",
    href: "/settings",
    status: "active",
    description: "Profile details, display currency & security settings",
    scope: "system",
  },
];

export const DASHBOARD_NAVIGATION: NavItem[] = [
  ...SHARED_NAVIGATION,
  ...ACCOUNT_NAVIGATION,
  ...SYSTEM_NAVIGATION,
];
