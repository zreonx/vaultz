"use client";

import React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export interface DataTableSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onClear?: () => void;
}

export function DataTableSearch({
  value,
  onChange,
  placeholder = "Search...",
  className,
  onClear,
}: DataTableSearchProps) {
  return (
    <div className={cn("relative flex-1 max-w-sm", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--muted-foreground)]" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 pl-8.5 pr-8 text-xs sm:text-sm bg-[var(--surface)] border-[var(--border)] rounded-lg transition-colors focus:border-[var(--accent)]"
      />
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          onClick={() => {
            onChange("");
            onClear?.();
          }}
          aria-label="Clear search"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}

export interface DataTableToolbarProps {
  children: React.ReactNode;
  className?: string;
}

export function DataTableToolbar({ children, className }: DataTableToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      {children}
    </div>
  );
}

export interface DataTableShellProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  headerContent?: React.ReactNode;
  isLoading?: boolean;
  loadingRows?: number;
  loadingColumns?: number;
  isEmpty?: boolean;
  emptyTitle?: string;
  emptyDescription?: React.ReactNode;
  emptyIcon?: React.ReactNode;
  emptyAction?: React.ReactNode;
  pagination?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function DataTableShell({
  title,
  description,
  badge,
  actions,
  headerContent,
  isLoading = false,
  loadingRows = 5,
  loadingColumns = 4,
  isEmpty = false,
  emptyTitle = "No records found",
  emptyDescription = "There are no records to display at this time.",
  emptyIcon,
  emptyAction,
  pagination,
  children,
  className,
}: DataTableShellProps) {
  const hasHeader = Boolean(title || description || badge || actions || headerContent);

  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xs overflow-hidden transition-all",
        className
      )}
    >
      {hasHeader && (
        <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border)]">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              {title && (
                <h3 className="text-sm font-semibold tracking-tight text-[var(--foreground)]">
                  {title}
                </h3>
              )}
              {badge}
            </div>
            {description && (
              <p className="text-xs text-[var(--muted-foreground)]">
                {description}
              </p>
            )}
          </div>
          {(actions || headerContent) && (
            <div className="flex items-center gap-2 pt-1 sm:pt-0">
              {headerContent}
              {actions}
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="p-4 space-y-3">
          <div className="flex gap-4 border-b border-[var(--border)] pb-2.5">
            {Array.from({ length: loadingColumns }).map((_, i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
          {Array.from({ length: loadingRows }).map((_, r) => (
            <div
              key={r}
              className="flex gap-4 py-2 border-b border-[var(--border-subtle)] last:border-0"
            >
              {Array.from({ length: loadingColumns }).map((_, c) => (
                <Skeleton
                  key={c}
                  className={cn("h-4 flex-1", c === 0 ? "w-1/3" : "w-1/4")}
                />
              ))}
            </div>
          ))}
        </div>
      ) : isEmpty ? (
        <div className="p-6">
          <Alert variant="muted" className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              {emptyIcon}
              <div>
                <AlertTitle className="text-sm font-medium">{emptyTitle}</AlertTitle>
                <AlertDescription className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  {emptyDescription}
                </AlertDescription>
              </div>
            </div>
            {emptyAction && <div className="shrink-0">{emptyAction}</div>}
          </Alert>
        </div>
      ) : (
        <div className="overflow-x-auto">{children}</div>
      )}

      {pagination && !isLoading && !isEmpty && (
        <div className="border-t border-[var(--border)] px-4 py-3 bg-[var(--surface-subtle)]/30">
          {pagination}
        </div>
      )}
    </div>
  );
}
