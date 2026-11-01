"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeftRight,
  BarChart3,
  CalendarClock,
  Check,
  ChevronsUpDown,
  FolderKanban,
  Handshake,
  LayoutDashboard,
  LogIn,
  LogOut,
  PiggyBank,
  Plus,
  Settings,
  ShieldCheck,
  Target,
  User,
  Wallet,
} from "lucide-react";
import { DASHBOARD_NAVIGATION } from "@/config/navigation";
import { useWorkspace } from "@/context/workspace-context";
import { useCurrentUser, useLogoutMutation } from "@/hooks/use-auth";
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
  Categories: FolderKanban,
  Budgets: Target,
  "Savings Goals": PiggyBank,
  IOUs: Handshake,
  Recurring: CalendarClock,
  Reports: BarChart3,
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
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  tooltip={
                    activeWorkspace
                      ? `${activeWorkspace.name} (${activeWorkspace.currencyCode})`
                      : "Switch Account"
                  }
                >
                  <Avatar className="h-8 w-8 shrink-0 rounded-xl">
                    <AvatarFallback className="rounded-xl bg-[var(--accent)] text-xs font-semibold text-[var(--accent-foreground)]">
                      {activeWorkspace
                        ? activeWorkspace.currencyCode.slice(0, 2)
                        : "VZ"}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <>
                      <div className="grid flex-1 text-left text-xs leading-tight">
                        <span className="truncate font-semibold tracking-tight">
                          {activeWorkspace
                            ? activeWorkspace.name
                            : "Select Account"}
                        </span>
                        <span className="truncate text-[11px] text-[var(--muted-foreground)]">
                          {activeWorkspace
                            ? `${activeWorkspace.currencyCode} · ${activeWorkspace.typeName}`
                            : "Personal Account"}
                        </span>
                      </div>
                      <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
                    </>
                  )}
                </SidebarMenuButton>
              </DropdownMenuTrigger>

              <DropdownMenuContent side="bottom" align="start" className="w-64">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>Accounts</span>
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
                            className="px-1.5 py-0 text-[10px] tabular-nums"
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
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {DASHBOARD_NAVIGATION.map((item) => {
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

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg">
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
                <DropdownMenuContent side="top" align="start" className="w-56">
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
