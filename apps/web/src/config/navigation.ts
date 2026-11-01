export interface NavItem {
  title: string;
  href: string;
  status: "active" | "planned";
  description: string;
}

export const DASHBOARD_NAVIGATION: NavItem[] = [
  {
    title: "Overview",
    href: "/dashboard",
    status: "active",
    description: "Net worth, monthly cash flow & budget pacing",
  },
  {
    title: "Accounts",
    href: "/accounts",
    status: "active",
    description: "Checking, savings, cash & credit card balances",
  },
  {
    title: "Transactions",
    href: "/transactions",
    status: "active",
    description: "Income, expenses & transfers between accounts",
  },
  {
    title: "Categories",
    href: "/categories",
    status: "active",
    description: "Custom income & spending categories",
  },
  {
    title: "Budgets",
    href: "/budgets",
    status: "active",
    description: "Monthly spending limits & progress",
  },
  {
    title: "Savings Goals",
    href: "/savings",
    status: "active",
    description: "Target milestones & dedicated savings",
  },
  {
    title: "IOUs",
    href: "/lending",
    status: "active",
    description: "Personal lending, borrowing & repayment tracking",
  },
  {
    title: "Recurring",
    href: "/recurring",
    status: "active",
    description: "Scheduled bills, subscriptions & regular income",
  },
  {
    title: "Reports",
    href: "/reports",
    status: "active",
    description: "Cash flow insights, category breakdowns & exports",
  },
  {
    title: "Settings",
    href: "/settings",
    status: "active",
    description: "Profile details, display currency & security settings",
  },
];
