"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  Eye,
  EyeOff,
  LogIn,
  LogOut,
  Settings,
} from "lucide-react";
import { useWorkspace } from "@/context/workspace-context";
import { useCurrentUser, useLogoutMutation } from "@/hooks/use-auth";
import { useExchangeRates } from "@/hooks/use-exchange-rates";
import { formatMoney } from "@/lib/utils/currency";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { SimpleTooltip } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { DASHBOARD_NAVIGATION } from "@/config/navigation";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { NotificationBell } from "@/components/layout/notification-bell";

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user } = useCurrentUser();
  useExchangeRates();
  const logoutMutation = useLogoutMutation();
  const { activeWorkspace } = useWorkspace();

  const [isBalanceHidden, setIsBalanceHidden] = useState<boolean>(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("vaultz.hide_header_balance");
      if (stored === "true") {
        setIsBalanceHidden(true);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const toggleHideBalance = () => {
    setIsBalanceHidden((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem("vaultz.hide_header_balance", String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  };

  const activeNavItem =
    DASHBOARD_NAVIGATION.find((item) =>
      item.href === "/dashboard"
        ? pathname === "/dashboard"
        : pathname.startsWith(item.href)
    ) ?? DASHBOARD_NAVIGATION[0];

  const pageTitle = activeNavItem?.title ?? "Overview";

  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "VZ";

  return (
    <header className="sticky top-0 z-30 h-16 shrink-0 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-md">
      <div className="flex h-full w-full items-center justify-between gap-4 px-4">
        {/* Left: Sidebar Toggle + Breadcrumb + Active Account Pill */}
        <div className="flex min-w-0 items-center gap-3">
          <SidebarTrigger className="h-9 w-9 shrink-0 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)]" />
          <Separator orientation="vertical" className="h-5 shrink-0" />
          <div className="flex min-w-0 items-center gap-2.5">
            <Breadcrumb>
              <BreadcrumbList className="flex-nowrap whitespace-nowrap">
                <BreadcrumbItem className="hidden sm:inline-flex">
                  <BreadcrumbLink asChild>
                    <Link href="/dashboard">Vaultz</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden sm:inline-flex" />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-sm font-semibold">
                    {pageTitle}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            {activeNavItem?.scope === "account" && (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--accent)] border border-[var(--accent)]/20">
                For {activeWorkspace?.name || "Selected Account"}
              </span>
            )}

            {activeWorkspace && (
              <SimpleTooltip content={isBalanceHidden ? "Show balance" : "Hide balance"}>
                <button
                  type="button"
                  data-tour="header-balance-pill"
                  onClick={toggleHideBalance}
                  aria-label={isBalanceHidden ? "Show balance" : "Hide balance"}
                  className="group hidden items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] lg:inline-flex cursor-pointer select-none"
                >
                  <span className="font-semibold text-[var(--accent)]">
                    {activeWorkspace.currencyCode}
                  </span>
                  <span className="text-[var(--muted-foreground)]">·</span>
                  <span className="tabular-nums font-medium">
                    {isBalanceHidden
                      ? "••••••"
                      : formatMoney(
                          activeWorkspace.balance,
                          activeWorkspace.currencyCode
                        )}
                  </span>
                  {isBalanceHidden ? (
                    <EyeOff className="h-3 w-3 text-[var(--muted-foreground)] transition-colors group-hover:text-[var(--foreground)]" />
                  ) : (
                    <Eye className="h-3 w-3 text-[var(--muted-foreground)] transition-colors group-hover:text-[var(--foreground)]" />
                  )}
                </button>
              </SimpleTooltip>
            )}
          </div>
        </div>

        {/* Right: Theme Toggle + Notifications + User Menu */}
        <div className="flex shrink-0 items-center gap-2">
          <ThemeToggle />
          {user && <NotificationBell />}
          {user ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 gap-2 rounded-xl border-0 pl-2 pr-2.5 text-xs hover:bg-[var(--surface-muted)] focus-visible:ring-0"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px]">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden max-w-[110px] truncate font-medium sm:inline">
                      {user.fullName}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)]" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="space-y-0.5">
                    <div className="truncate text-xs font-semibold">
                      {user.fullName}
                    </div>
                    <div className="truncate text-[11px] font-normal text-[var(--muted-foreground)]">
                      {user.email}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => router.push("/settings")}>
                    <Settings className="h-3.5 w-3.5" />
                    Profile &amp; Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => logoutMutation.mutate()}
                    disabled={logoutMutation.isPending}
                    className="text-[var(--danger)] focus:text-[var(--danger)]"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/login">
                  <LogIn className="h-3.5 w-3.5" />
                  Sign In
                </Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Get Started</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
