"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  type?: ToastType;
  duration?: number;
}

type ToastInput =
  | string
  | {
      title: string;
      description?: string;
      type?: ToastType;
      duration?: number;
    };

interface ToastContextValue {
  toasts: ToastItem[];
  addToast: (toast: ToastInput, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let globalToastFn: ((input: ToastInput, type?: ToastType) => void) | null = null;

export const toast = (
  title: string,
  options?: { description?: string; duration?: number }
) => {
  globalToastFn?.({ title, ...options });
};

toast.success = (
  title: string,
  options?: { description?: string; duration?: number }
) => {
  globalToastFn?.({ title, ...options, type: "success" });
};

toast.error = (
  title: string,
  options?: { description?: string; duration?: number }
) => {
  globalToastFn?.({ title, ...options, type: "error" });
};

toast.info = (
  title: string,
  options?: { description?: string; duration?: number }
) => {
  globalToastFn?.({ title, ...options, type: "info" });
};

toast.warning = (
  title: string,
  options?: { description?: string; duration?: number }
) => {
  globalToastFn?.({ title, ...options, type: "warning" });
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (input: ToastInput, overrideType?: ToastType) => {
      const id = Math.random().toString(36).substring(2, 9);
      const item: ToastItem =
        typeof input === "string"
          ? { id, title: input, type: overrideType ?? "info" }
          : {
              id,
              title: input.title,
              description: input.description,
              type: overrideType ?? input.type ?? "info",
              duration: input.duration,
            };

      setToasts((prev) => [...prev, item]);

      const duration = item.duration ?? 4000;
      setTimeout(() => {
        removeToast(id);
      }, duration);
    },
    [removeToast]
  );

  useEffect(() => {
    globalToastFn = addToast;
    return () => {
      globalToastFn = null;
    };
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <Toaster toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

export function Toaster({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex max-w-sm w-full flex-col gap-2 pointer-events-none"
    >
      {toasts.map((item) => {
        const isSuccess = item.type === "success";
        const isError = item.type === "error";
        const isWarning = item.type === "warning";

        return (
          <div
            key={item.id}
            role="status"
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 shadow-lg backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-2",
              "bg-[var(--card)] text-[var(--foreground)] border-[var(--border)]",
              isSuccess && "border-[var(--accent)]/40 bg-[var(--surface)]",
              isError && "border-[var(--danger)]/40 bg-[var(--surface)]",
              isWarning && "border-amber-500/40 bg-[var(--surface)]"
            )}
          >
            <div className="shrink-0 mt-0.5">
              {isSuccess && (
                <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" />
              )}
              {isError && (
                <AlertCircle className="h-4 w-4 text-[var(--danger)]" />
              )}
              {isWarning && (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              )}
              {!isSuccess && !isError && !isWarning && (
                <Info className="h-4 w-4 text-[var(--muted-foreground)]" />
              )}
            </div>
            <div className="flex-1 space-y-0.5 min-w-0">
              <p className="text-sm font-medium leading-tight">{item.title}</p>
              {item.description && (
                <p className="text-xs text-[var(--muted-foreground)] leading-normal">
                  {item.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(item.id)}
              className="shrink-0 rounded-md p-0.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  return {
    toast,
    toasts: ctx?.toasts ?? [],
    addToast: ctx?.addToast ?? toast,
    removeToast: ctx?.removeToast ?? (() => {}),
  };
}
