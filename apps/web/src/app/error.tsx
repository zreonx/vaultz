"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--danger-soft)] text-[var(--danger)]">
            <AlertCircle className="h-5 w-5" />
          </div>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>
            An unexpected error occurred while rendering this view.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="rounded-xl bg-[var(--surface-muted)] p-3 font-mono text-xs text-[var(--muted-foreground)]">
            {error.message || "Unexpected application error"}
          </p>
          <Button onClick={reset} className="w-full">
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
