"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  BarChart3,
  Calculator,
  CalendarClock,
  Check,
  ChevronsUpDown,
  FolderKanban,
  Handshake,
  LayoutDashboard,
  LogIn,
  LogOut,
  Pencil,
  PiggyBank,
  Plus,
  Settings,
  ShieldCheck,
  Target,
  User,
  Wallet,
} from "lucide-react";
import {
  ACCOUNT_NAVIGATION,
  ALL_ACCOUNTS_NAVIGATION,
  SYSTEM_NAVIGATION,
} from "@/config/navigation";
import { useWorkspace } from "@/context/workspace-context";
import { useCurrentUser, useLogoutMutation } from "@/hooks/use-auth";
import { cn } from "@/lib/utils/cn";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Overview: LayoutDashboard,
  Accounts: Wallet,
  Transactions: ArrowLeftRight,
  "Transaction History": ArrowLeftRight,
  Categories: FolderKanban,
  Budgets: Target,
  "Savings Goals": PiggyBank,
  IOUs: Handshake,
  Recurring: CalendarClock,
  Reports: BarChart3,
  "Calculators & Tools": Calculator,
  Settings: Settings,
};

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const { data: user } = useCurrentUser();
  const logoutMutation = useLogoutMutation();
  const {
    workspaces,
    selectedWorkspaceId,
    activeWorkspace,
    setSelectedWorkspaceId,
    openCreateWorkspaceDialog,
    openEditWorkspaceDialog,
    openTransferDialog,
  } = useWorkspace();
  const isCollapsed = state === "collapsed" && !isMobile;

  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "VZ";

  return (
    <Sidebar collapsible="icon" aria-label="Primary Sidebar Navigation">
      <SidebarHeader className={cn("border-b border-[var(--border-subtle)]", isCollapsed ? "p-2 justify-center" : "p-3 pb-2.5")}>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className={cn(
                    "rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)]/60 hover:bg-[var(--surface-muted)] transition-all",
                    isCollapsed ? "h-10 w-10 p-0 justify-center mx-auto" : "p-2"
                  )}
                  tooltip={
                    activeWorkspace
                      ? `${activeWorkspace.name} (${activeWorkspace.currencyCode})`
                      : "Switch Account"
                  }
                >
                  <Avatar className="h-8 w-8 shrink-0 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                      {activeWorkspace
                        ? activeWorkspace.currencyCode.slice(0, 3)
                        : "VZ"}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <>
                      <div className="grid flex-1 text-left text-xs leading-tight">
                        <span className="truncate font-semibold tracking-tight text-[var(--foreground)]">
                          {activeWorkspace
                            ? activeWorkspace.name
                            : "Select Account"}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] text-[var(--muted-foreground)] mt-0.5">
                          <Badge
                            variant="neutral"
                            className="px-1 py-0 text-[10px] font-mono h-3.5 leading-none"
                          >
                            {activeWorkspace?.currencyCode ?? "USD"}
                          </Badge>
                          <span className="truncate">
                            {activeWorkspace?.typeName ?? "Personal Account"}
                          </span>
                        </div>
                      </div>
                      <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
                    </>
                  )}
                </SidebarMenuButton>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                side={isCollapsed ? "right" : "bottom"}
                align="start"
                sideOffset={isCollapsed ? 12 : 6}
                className="w-72"
              >
                <DropdownMenuLabel className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-xs">Switch Selected Account</div>
                    <div className="text-[10px] font-normal text-[var(--muted-foreground)]">
                      Controls Budgets, Savings, IOUs, Recurring &amp; Categories
                    </div>
                  </div>
                  <Badge variant="neutral" className="tabular-nums">
                    {workspaces.length}
                  </Badge>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {workspaces.map((ws) => {
                  const isSelected = ws.id === selectedWorkspaceId;
                  return (
                    <DropdownMenuItem
                      key={ws.id}
                      onSelect={() => setSelectedWorkspaceId(ws.id)}
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-medium">
                            {ws.name}
                          </span>
                          <Badge
                            variant="default"
                            className="px-1.5 py-0 text-[10px] tabular-nums font-mono"
                          >
                            {ws.currencyCode}
                          </Badge>
                        </div>
                        <div className="truncate text-[11px] text-[var(--muted-foreground)]">
                          {ws.typeName}
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
                      )}
                    </DropdownMenuItem>
                  );
                })}

                <DropdownMenuSeparator />
                {activeWorkspace && (
                  <DropdownMenuItem onSelect={() => openEditWorkspaceDialog(activeWorkspace.id)}>
                    <Pencil className="h-3.5 w-3.5 text-[var(--accent)]" />
                    Edit Current Account ({activeWorkspace.name})
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => openCreateWorkspaceDialog()}>
                  <Plus className="h-3.5 w-3.5 text-[var(--accent)]" />
                  Add New Account
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => openTransferDialog()}>
                  <ArrowLeftRight className="h-3.5 w-3.5 text-[var(--accent)]" />
                  Transfer Between Accounts
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* GROUP 1: ALL ACCOUNTS */}
        <SidebarGroup data-tour="sidebar-nav">
          <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] px-2">
            All accounts
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ALL_ACCOUNTS_NAVIGATION.map((item) => {
                const Icon = ICONS[item.title] ?? LayoutDashboard;
                const label = item.title;
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.href);

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={`${label} (All Accounts)`}
                    >
                      <Link
                        href={item.href}
                        onClick={() => {
                          if (isMobile) setOpenMobile(false);
                        }}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {!isCollapsed && <span>{label}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* GROUP 2: FOR [ACCOUNT NAME] */}
        <SidebarGroup className="pt-2">
          <SidebarGroupLabel className="flex items-center justify-between text-[11px] font-semibold tracking-wider text-[var(--foreground)] px-2">
            <span className="truncate uppercase font-bold text-[var(--accent)]">
              {activeWorkspace && !isCollapsed
                ? `For ${activeWorkspace.name}`
                : "For Selected Account"}
            </span>
            {!isCollapsed && activeWorkspace && (
              <Badge
                variant="default"
                className="text-[10px] px-1.5 py-0 font-mono font-medium"
              >
                {activeWorkspace.currencyCode}
              </Badge>
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ACCOUNT_NAVIGATION.map((item) => {
                const Icon = ICONS[item.title] ?? LayoutDashboard;
                const label = item.title;
                const isActive = pathname.startsWith(item.href);

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={`${label} (for ${activeWorkspace ? activeWorkspace.name : "selected account"})`}
                    >
                      <Link
                        href={item.href}
                        onClick={() => {
                          if (isMobile) setOpenMobile(false);
                        }}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {!isCollapsed && <span>{label}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* GROUP 3: GENERAL / SYSTEM */}
        <SidebarGroup className="pt-2">
          <SidebarGroupLabel className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] px-2">
            General
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {SYSTEM_NAVIGATION.map((item) => {
                const Icon = ICONS[item.title] ?? LayoutDashboard;
                const label = item.title;
                const isActive = pathname.startsWith(item.href);

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={label}
                    >
                      <Link
                        href={item.href}
                        onClick={() => {
                          if (isMobile) setOpenMobile(false);
                        }}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        {!isCollapsed && <span>{label}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className={cn(isCollapsed && "p-2 justify-center")}>
        <SidebarMenu>
          <SidebarMenuItem>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className={cn(isCollapsed && "h-10 w-10 p-0 justify-center mx-auto")}
                    tooltip={isCollapsed ? user.fullName : undefined}
                  >
                    <Avatar className="h-7 w-7 shrink-0 rounded-lg">
                      <AvatarFallback className="rounded-lg text-[11px]">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    {!isCollapsed && (
                      <>
                        <div className="grid flex-1 text-left text-xs leading-tight">
                          <span className="truncate font-semibold">
                            {user.fullName}
                          </span>
                          <span className="truncate text-[11px] text-[var(--muted-foreground)]">
                            {user.email}
                          </span>
                        </div>
                        <ChevronsUpDown className="ml-auto h-4 w-4 text-[var(--muted-foreground)]" />
                      </>
                    )}
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side={isCollapsed ? "right" : "top"}
                  align={isCollapsed ? "end" : "start"}
                  sideOffset={isCollapsed ? 12 : 6}
                  className="w-56"
                >
                  <DropdownMenuLabel className="flex items-center justify-between">
                    <span>{user.fullName}</span>
                    <Badge variant="default" className="tabular-nums">
                      {user.defaultCurrencyCode}
                    </Badge>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => router.push("/settings")}>
                    <User className="h-3.5 w-3.5" />
                    Profile &amp; Preferences
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => router.push("/settings?tab=security")}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Password &amp; Security
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => logoutMutation.mutate()}
                    className="text-[var(--danger)] focus:text-[var(--danger)]"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <SidebarMenuButton asChild tooltip="Sign In to Vaultz">
                <Link href="/login">
                  <LogIn className="h-4 w-4 shrink-0" />
                  {!isCollapsed && <span>Sign In / Register</span>}
                </Link>
              </SidebarMenuButton>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
