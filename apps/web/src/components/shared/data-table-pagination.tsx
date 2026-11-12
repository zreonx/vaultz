"use client";

import React, { useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils/cn";

export interface DataTablePaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  isLoading?: boolean;
  itemName?: string;
  className?: string;
}

export function DataTablePagination({
  page,
  pageSize,
  totalCount,
  totalPages,
  onPageChange,
  isLoading = false,
  itemName = "transactions",
  className = "",
}: DataTablePaginationProps) {
  const normalizedTotalPages = Math.max(1, totalPages);
  const startItem = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalCount);

  const pageNumbers = useMemo<(number | "ellipsis")[]>(() => {
    if (normalizedTotalPages <= 7) {
      return Array.from({ length: normalizedTotalPages }, (_, i) => i + 1);
    }
    if (page <= 4) {
      return [1, 2, 3, 4, 5, "ellipsis", normalizedTotalPages];
    }
    if (page >= normalizedTotalPages - 3) {
      return [
        1,
        "ellipsis",
        normalizedTotalPages - 4,
        normalizedTotalPages - 3,
        normalizedTotalPages - 2,
        normalizedTotalPages - 1,
        normalizedTotalPages,
      ];
    }
    return [
      1,
      "ellipsis",
      page - 1,
      page,
      page + 1,
      "ellipsis",
      normalizedTotalPages,
    ];
  }, [page, normalizedTotalPages]);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 text-xs text-[var(--muted-foreground)] sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div>
        {totalCount > 0 ? (
          <span>
            Showing{" "}
            <span className="font-semibold text-[var(--foreground)] tabular-nums">
              {startItem}–{endItem}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-[var(--foreground)] tabular-nums">
              {totalCount}
            </span>{" "}
            {itemName}
          </span>
        ) : (
          <span>0 {itemName}</span>
        )}
      </div>

      <div className="flex items-center gap-1 overflow-x-auto self-end sm:self-auto">
        {/* Beginning (First Page) */}
        <SimpleTooltip content="Beginning">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onPageChange(1)}
            disabled={page <= 1 || isLoading}
            className="h-8 w-8 rounded-lg border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-muted)] disabled:opacity-30 shrink-0"
            aria-label="Beginning page"
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </Button>
        </SimpleTooltip>

        {/* Backward (Previous Page) */}
        <SimpleTooltip content="Backward">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || isLoading}
            className="h-8 w-8 rounded-lg border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-muted)] disabled:opacity-30 shrink-0"
            aria-label="Backward"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
        </SimpleTooltip>

        {/* Numbered Page Buttons: 1, 2, 3... */}
        {pageNumbers.map((p, idx) =>
          p === "ellipsis" ? (
            <span
              key={`ellipsis-${idx}`}
              className="flex h-8 w-6 items-center justify-center text-xs text-[var(--muted-foreground)] shrink-0 select-none"
            >
              …
            </span>
          ) : (
            <Button
              key={p}
              type="button"
              variant={p === page ? "default" : "outline"}
              size="icon"
              onClick={() => onPageChange(p)}
              disabled={isLoading}
              className={cn(
                "h-8 min-w-8 px-2 text-xs tabular-nums rounded-lg transition-all shrink-0",
                p === page
                  ? "bg-[var(--accent)] text-[var(--accent-foreground)] font-semibold shadow-xs hover:bg-[var(--accent)] hover:opacity-90 border-transparent"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
              )}
              aria-label={`Page ${p}`}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </Button>
          )
        )}

        {/* Forward (Next Page) */}
        <SimpleTooltip content="Forward">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= normalizedTotalPages || isLoading}
            className="h-8 w-8 rounded-lg border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-muted)] disabled:opacity-30 shrink-0"
            aria-label="Forward"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </SimpleTooltip>

        {/* Last Page */}
        <SimpleTooltip content="Last">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onPageChange(normalizedTotalPages)}
            disabled={page >= normalizedTotalPages || isLoading}
            className="h-8 w-8 rounded-lg border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-muted)] disabled:opacity-30 shrink-0"
            aria-label="Last page"
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </Button>
        </SimpleTooltip>
      </div>
    </div>
  );
}
