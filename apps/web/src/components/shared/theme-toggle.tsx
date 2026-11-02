"use client";

import React from "react";
import { Laptop, Moon, Sun } from "lucide-react";
import { useTheme, type ThemeMode } from "@/context/theme-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle({ variant = "icon" }: { variant?: "icon" | "segmented" }) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  if (variant === "segmented") {
    const options: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
      { mode: "light", label: "Light", icon: Sun },
      { mode: "dark", label: "Dark", icon: Moon },
      { mode: "system", label: "System", icon: Laptop },
    ];

    return (
      <div className="inline-flex items-center rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-1 gap-1">
        {options.map(({ mode, label, icon: Icon }) => {
          const isActive = theme === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() => setTheme(mode)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                isActive
                  ? "bg-[var(--surface)] text-[var(--foreground)] shadow-xs"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 w-9 p-0 rounded-xl hover:bg-[var(--surface-muted)] cursor-pointer"
          title={`Current theme: ${theme} (${resolvedTheme})`}
          aria-label="Toggle theme"
        >
          {resolvedTheme === "dark" ? (
            <Moon className="h-4 w-4 text-[var(--foreground)] transition-transform" />
          ) : (
            <Sun className="h-4 w-4 text-[var(--foreground)] transition-transform" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem onClick={() => setTheme("light")} className="gap-2 text-xs">
          <Sun className="h-3.5 w-3.5 text-[var(--accent)]" />
          <span>Light Mode</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")} className="gap-2 text-xs">
          <Moon className="h-3.5 w-3.5 text-[var(--accent)]" />
          <span>Dark Mode</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")} className="gap-2 text-xs">
          <Laptop className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
