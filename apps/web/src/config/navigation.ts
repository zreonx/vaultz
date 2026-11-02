export interface NavItem {
  title: string;
  href: string;
  status: "active" | "planned";
  description: string;
  scope?: "shared" | "account" | "system";
}

/**
 * Shared features that encompass all accounts across the entire portfolio.
 */
export const SHARED_NAVIGATION: NavItem[] = [
  {
    title: "Overview",
    href: "/dashboard",
    status: "active",
    description: "Net worth, monthly cash flow & portfolio pacing",
    scope: "shared",
  },
  {
    title: "Accounts",
    href: "/accounts",
    status: "active",
    description: "Checking, savings, cash & credit card balances",
    scope: "shared",
  },
  {
    title: "Transactions",
    href: "/transactions",
    status: "active",
    description: "All income, expenses & transfers across accounts",
    scope: "shared",
  },
  {
    title: "Reports",
    href: "/reports",
    status: "active",
    description: "Cash flow insights, category breakdowns & exports",
    scope: "shared",
  },
];

/**
 * Independent features scoped specifically to the currently selected active account.
 */
export const ACCOUNT_NAVIGATION: NavItem[] = [
  {
    title: "Budgets",
    href: "/budgets",
    status: "active",
    description: "Monthly spending limits & category progress",
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
