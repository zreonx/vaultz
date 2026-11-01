"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const SIDEBAR_KEYBOARD_SHORTCUT = "b";

type SidebarContextValue = {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }
  return context;
}

export const SidebarProvider = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    defaultOpen?: boolean;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }
>(
  (
    {
      defaultOpen = true,
      open: openProp,
      onOpenChange: setOpenProp,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const [isMobile, setIsMobile] = React.useState(false);
    const [openMobile, setOpenMobile] = React.useState(false);
    const [_open, _setOpen] = React.useState(defaultOpen);
    const open = openProp ?? _open;

    React.useEffect(() => {
      const mql = window.matchMedia("(max-width: 1023px)");
      const onChange = () => setIsMobile(mql.matches);
      onChange();
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    }, []);

    const setOpen = React.useCallback(
      (value: boolean | ((value: boolean) => boolean)) => {
        const openState = typeof value === "function" ? value(open) : value;
        if (setOpenProp) {
          setOpenProp(openState);
        } else {
          _setOpen(openState);
        }
      },
      [setOpenProp, open]
    );

    const toggleSidebar = React.useCallback(() => {
      return isMobile
        ? setOpenMobile((prev) => !prev)
        : setOpen((prev) => !prev);
    }, [isMobile, setOpen, setOpenMobile]);

    React.useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (
          event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
          (event.metaKey || event.ctrlKey)
        ) {
          event.preventDefault();
          toggleSidebar();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [toggleSidebar]);

    const state = open ? "expanded" : "collapsed";

    const contextValue = React.useMemo<SidebarContextValue>(
      () => ({
        state,
        open,
        setOpen,
        isMobile,
        openMobile,
        setOpenMobile,
        toggleSidebar,
      }),
      [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar]
    );

    return (
      <SidebarContext.Provider value={contextValue}>
        <TooltipProvider delayDuration={0}>
          <div
            ref={ref}
            data-sidebar-wrapper=""
            className={cn(
              "group/sidebar-wrapper flex min-h-screen w-full bg-[var(--background)] text-[var(--foreground)]",
              className
            )}
            {...props}
          >
            {children}
          </div>
        </TooltipProvider>
      </SidebarContext.Provider>
    );
  }
);
SidebarProvider.displayName = "SidebarProvider";

export const Sidebar = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"aside"> & {
    side?: "left" | "right";
    collapsible?: "offcanvas" | "icon" | "none";
  }
>(
  (
    {
      side = "left",
      collapsible = "icon",
      className,
      children,
      ...props
    },
    ref
  ) => {
    const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

    if (isMobile) {
      return (
        <Sheet open={openMobile} onOpenChange={setOpenMobile}>
          <SheetContent
            data-sidebar="sidebar"
            data-mobile="true"
            side={side}
            className="w-72 bg-[var(--surface)] p-0 text-[var(--foreground)]"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation Sidebar</SheetTitle>
              <SheetDescription>
                Primary Vaultz workspace navigation
              </SheetDescription>
            </SheetHeader>
            <div className="flex h-full w-full flex-col">{children}</div>
          </SheetContent>
        </Sheet>
      );
    }

    const isCollapsedIcon = state === "collapsed" && collapsible === "icon";

    return (
      <aside
        ref={ref}
        data-state={state}
        data-collapsible={state === "collapsed" ? collapsible : ""}
        data-side={side}
        className={cn(
          "group peer sticky top-0 hidden h-screen shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] transition-[width] duration-200 ease-in-out lg:flex",
          isCollapsedIcon ? "w-16" : "w-64",
          className
        )}
        {...props}
      >
        <div className="flex h-full w-full flex-col justify-between">
          {children}
        </div>
      </aside>
    );
  }
);
Sidebar.displayName = "Sidebar";

export const SidebarTrigger = React.forwardRef<
  React.ComponentRef<typeof Button>,
  React.ComponentProps<typeof Button>
>(({ className, onClick, ...props }, ref) => {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      ref={ref}
      type="button"
      data-sidebar="trigger"
      variant="ghost"
      size="sm"
      className={cn("h-8 w-8 p-0", className)}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <PanelLeft className="h-4 w-4" />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
});
SidebarTrigger.displayName = "SidebarTrigger";

export const SidebarRail = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button">
>(({ className, ...props }, ref) => {
  const { toggleSidebar } = useSidebar();

  return (
    <button
      ref={ref}
      data-sidebar="rail"
      aria-label="Toggle Sidebar"
      tabIndex={-1}
      onClick={toggleSidebar}
      title="Toggle Sidebar (Ctrl+B)"
      className={cn(
        "absolute inset-y-0 -right-2 z-20 hidden w-3 cursor-ew-resize transition-all after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-[var(--border)] lg:flex",
        className
      )}
      {...props}
    />
  );
});
SidebarRail.displayName = "SidebarRail";

export const SidebarInset = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative flex min-h-screen min-w-0 flex-1 flex-col overflow-x-hidden bg-[var(--background)]",
      className
    )}
    {...props}
  />
));
SidebarInset.displayName = "SidebarInset";

export const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="header"
    className={cn(
      "flex h-16 shrink-0 flex-col justify-center border-b border-[var(--border)] px-3",
      className
    )}
    {...props}
  />
));
SidebarHeader.displayName = "SidebarHeader";

export const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="footer"
    className={cn(
      "flex shrink-0 flex-col gap-2 border-t border-[var(--border)] p-3",
      className
    )}
    {...props}
  />
));
SidebarFooter.displayName = "SidebarFooter";

export const SidebarSeparator = React.forwardRef<
  React.ComponentRef<typeof Separator>,
  React.ComponentProps<typeof Separator>
>(({ className, ...props }, ref) => (
  <Separator
    ref={ref}
    data-sidebar="separator"
    className={cn("mx-2 w-auto bg-[var(--border-subtle)]", className)}
    {...props}
  />
));
SidebarSeparator.displayName = "SidebarSeparator";

export const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="content"
    className={cn(
      "sidebar-scroll flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden",
      className
    )}
    {...props}
  />
));
SidebarContent.displayName = "SidebarContent";

export const SidebarGroup = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="group"
    className={cn("relative flex w-full min-w-0 flex-col p-2", className)}
    {...props}
  />
));
SidebarGroup.displayName = "SidebarGroup";

export const SidebarGroupLabel = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & { asChild?: boolean }
>(({ className, asChild = false, ...props }, ref) => {
  const { state, isMobile } = useSidebar();
  const Comp = asChild ? Slot : "div";

  if (state === "collapsed" && !isMobile) {
    return null;
  }

  return (
    <Comp
      ref={ref}
      data-sidebar="group-label"
      className={cn(
        "flex h-7 shrink-0 items-center rounded-md px-2.5 text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]",
        className
      )}
      {...props}
    />
  );
});
SidebarGroupLabel.displayName = "SidebarGroupLabel";

export const SidebarGroupContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="group-content"
    className={cn("w-full text-sm", className)}
    {...props}
  />
));
SidebarGroupContent.displayName = "SidebarGroupContent";

export const SidebarMenu = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    data-sidebar="menu"
    className={cn("flex w-full min-w-0 flex-col gap-1", className)}
    {...props}
  />
));
SidebarMenu.displayName = "SidebarMenu";

export const SidebarMenuItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, ...props }, ref) => (
  <li
    ref={ref}
    data-sidebar="menu-item"
    className={cn("group/menu-item relative", className)}
    {...props}
  />
));
SidebarMenuItem.displayName = "SidebarMenuItem";

const sidebarMenuButtonVariants = cva(
  "peer/menu-button flex w-full items-center gap-2.5 overflow-hidden rounded-xl p-2.5 text-left text-sm outline-none transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:pointer-events-none disabled:opacity-50 data-[active=true]:bg-[var(--accent-soft)] data-[active=true]:font-medium data-[active=true]:text-[var(--accent)] [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      size: {
        default: "h-10 text-sm",
        sm: "h-8 text-xs",
        lg: "h-12 text-sm",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

export const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & {
    asChild?: boolean;
    isActive?: boolean;
    tooltip?: string;
  } & VariantProps<typeof sidebarMenuButtonVariants>
>(
  (
    {
      asChild = false,
      isActive = false,
      size = "default",
      tooltip,
      className,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    const { isMobile, state } = useSidebar();
    const isCollapsed = state === "collapsed" && !isMobile;

    const button = (
      <Comp
        ref={ref}
        data-sidebar="menu-button"
        data-size={size}
        data-active={isActive}
        className={cn(
          sidebarMenuButtonVariants({ size }),
          isCollapsed && "justify-center px-0",
          className
        )}
        {...props}
      />
    );

    if (!tooltip || !isCollapsed) {
      return button;
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right" align="center">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    );
  }
);
SidebarMenuButton.displayName = "SidebarMenuButton";

export const SidebarMenuBadge = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  const { state, isMobile } = useSidebar();
  if (state === "collapsed" && !isMobile) {
    return null;
  }

  return (
    <div
      ref={ref}
      data-sidebar="menu-badge"
      className={cn(
        "pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 flex h-5 min-w-5 select-none items-center justify-center rounded-md px-1.5 text-[10px] font-medium tabular-nums text-[var(--muted-foreground)]",
        className
      )}
      {...props}
    />
  );
});
SidebarMenuBadge.displayName = "SidebarMenuBadge";
