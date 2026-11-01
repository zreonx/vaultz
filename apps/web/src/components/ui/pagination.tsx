"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { type ButtonProps, buttonVariants } from "@/components/ui/button";

const Pagination = ({ className, ...props }: React.ComponentProps<"nav">) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn("mx-auto flex w-full justify-center", className)}
    {...props}
  />
);
Pagination.displayName = "Pagination";

const PaginationContent = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("flex flex-row items-center gap-1", className)}
    {...props}
  />
));
PaginationContent.displayName = "PaginationContent";

const PaginationItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("", className)} {...props} />
));
PaginationItem.displayName = "PaginationItem";

type PaginationLinkProps = {
  isActive?: boolean;
} & Pick<ButtonProps, "size"> &
  React.ComponentProps<"button">;

const PaginationLink = ({
  className,
  isActive,
  size = "icon",
  ...props
}: PaginationLinkProps) => (
  <button
    type="button"
    aria-current={isActive ? "page" : undefined}
    className={cn(
      buttonVariants({
        variant: isActive ? "default" : "outline",
        size,
      }),
      isActive
        ? "bg-[var(--accent)] text-[var(--accent-foreground)] font-semibold shadow-xs hover:bg-[var(--accent)] hover:opacity-90"
        : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-muted)]",
      "h-8 min-w-8 px-2.5 text-xs rounded-lg transition-all",
      className
    )}
    {...props}
  />
);
PaginationLink.displayName = "PaginationLink";

const PaginationPrevious = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to previous page"
    size="default"
    className={cn("gap-1 pl-2.5 pr-3 text-xs h-8", className)}
    {...props}
  >
    <ChevronLeft className="h-3.5 w-3.5" />
    <span className="hidden sm:inline">Previous</span>
  </PaginationLink>
);
PaginationPrevious.displayName = "PaginationPrevious";

const PaginationNext = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to next page"
    size="default"
    className={cn("gap-1 pl-3 pr-2.5 text-xs h-8", className)}
    {...props}
  >
    <span className="hidden sm:inline">Next</span>
    <ChevronRight className="h-3.5 w-3.5" />
  </PaginationLink>
);
PaginationNext.displayName = "PaginationNext";

const PaginationFirst = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to first page"
    size="icon"
    className={cn("text-xs h-8 w-8 p-0", className)}
    {...props}
  >
    <ChevronsLeft className="h-3.5 w-3.5" />
    <span className="sr-only">First page</span>
  </PaginationLink>
);
PaginationFirst.displayName = "PaginationFirst";

const PaginationLast = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => (
  <PaginationLink
    aria-label="Go to last page"
    size="icon"
    className={cn("text-xs h-8 w-8 p-0", className)}
    {...props}
  >
    <ChevronsRight className="h-3.5 w-3.5" />
    <span className="sr-only">Last page</span>
  </PaginationLink>
);
PaginationLast.displayName = "PaginationLast";

const PaginationEllipsis = ({
  className,
  ...props
}: React.ComponentProps<"span">) => (
  <span
    aria-hidden
    className={cn(
      "flex h-8 w-8 items-center justify-center text-xs text-[var(--muted-foreground)]",
      className
    )}
    {...props}
  >
    <MoreHorizontal className="h-3.5 w-3.5" />
    <span className="sr-only">More pages</span>
  </span>
);
PaginationEllipsis.displayName = "PaginationEllipsis";

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationFirst,
  PaginationLast,
};
