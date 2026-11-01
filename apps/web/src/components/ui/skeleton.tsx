import * as React from "react";
import { cn } from "@/lib/utils/cn";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-[var(--surface-muted)]",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
