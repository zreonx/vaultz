import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const alertVariants = cva(
  "relative w-full rounded-xl border px-4 py-3.5 text-sm [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-2px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-[var(--foreground)]",
  {
    variants: {
      variant: {
        default:
          "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] [&>svg]:text-[var(--accent)]",
        muted:
          "border-[var(--border-subtle)] bg-[var(--background)] text-[var(--foreground)] [&>svg]:text-[var(--accent)]",
        destructive:
          "border-[var(--danger)]/30 bg-[var(--danger-soft)] text-[var(--danger)] [&>svg]:text-[var(--danger)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-xs leading-relaxed text-[var(--muted-foreground)]", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
