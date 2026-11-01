"use client";

import * as React from "react";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface DatePickerProps {
  id?: string;
  value?: string;
  onChange: (isoDate: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  className?: string;
  "aria-label"?: string;
}

export function DatePicker({
  id,
  value,
  onChange,
  placeholder = "Pick a date",
  allowClear = false,
  className,
  "aria-label": ariaLabel,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative flex w-full items-center">
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-label={ariaLabel}
            className={cn(
              "h-10 w-full justify-start bg-[var(--surface)] px-3.5 text-left font-normal tabular-nums",
              !value && "text-[var(--muted-foreground)]",
              className
            )}
          >
            <CalendarIcon className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
            <span className="truncate">{value || placeholder}</span>
          </Button>
        </PopoverTrigger>
        {allowClear && value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1.5 h-7 w-7 p-0 text-[var(--muted-foreground)]"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            aria-label="Clear date"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      <PopoverContent align="start" className="w-72 p-3.5">
        <Calendar
          selected={value}
          onSelect={(iso) => {
            onChange(iso);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
