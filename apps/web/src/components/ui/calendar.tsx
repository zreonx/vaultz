"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export interface CalendarProps {
  /** Selected ISO date string (YYYY-MM-DD) */
  selected?: string;
  onSelect?: (isoDate: string) => void;
  className?: string;
}

function parseIsoDate(iso?: string): { year: number; month: number; day: number } | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return null;
  }
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { year: y, month: m - 1, day: d };
}

function toIsoDate(year: number, monthIndex: number, day: number): string {
  const m = String(monthIndex + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export function Calendar({ selected, onSelect, className }: CalendarProps) {
  const parsed = parseIsoDate(selected);
  const now = new Date();
  const todayIso = toIsoDate(now.getFullYear(), now.getMonth(), now.getDate());

  const [viewYear, setViewYear] = React.useState<number>(
    parsed?.year ?? now.getFullYear()
  );
  const [viewMonth, setViewMonth] = React.useState<number>(
    parsed?.month ?? now.getMonth()
  );

  React.useEffect(() => {
    const p = parseIsoDate(selected);
    if (p) {
      setViewYear(p.year);
      setViewMonth(p.month);
    }
  }, [selected]);

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(d);
  }

  return (
    <div className={cn("space-y-3 select-none", className)}>
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={handlePrevMonth}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <div className="text-xs font-semibold tracking-tight tabular-nums">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={handleNextMonth}
          aria-label="Next month"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((dayName) => (
          <div
            key={dayName}
            className="py-1 text-[10px] font-medium text-[var(--muted-foreground)]"
          >
            {dayName}
          </div>
        ))}
        {cells.map((dayNumber, idx) => {
          if (dayNumber === null) {
            return <div key={`empty-${idx}`} className="h-8 w-8" />;
          }

          const cellIso = toIsoDate(viewYear, viewMonth, dayNumber);
          const isSelected = selected === cellIso;
          const isToday = todayIso === cellIso;

          return (
            <Button
              key={cellIso}
              type="button"
              variant={isSelected ? "default" : isToday ? "secondary" : "ghost"}
              size="sm"
              onClick={() => onSelect?.(cellIso)}
              className={cn(
                "h-8 w-8 p-0 text-xs tabular-nums",
                !isSelected && isToday && "border border-[var(--accent)]/40"
              )}
            >
              {dayNumber}
            </Button>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => onSelect?.(todayIso)}
        >
          Today ({todayIso})
        </Button>
      </div>
    </div>
  );
}
