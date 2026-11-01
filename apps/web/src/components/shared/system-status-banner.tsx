"use client";

import { Activity, Database, RefreshCw, Server } from "lucide-react";
import { useSystemStatus } from "@/hooks/use-system-status";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function SystemStatusBanner() {
  const { data, isLoading, isError, error, refetch, isFetching } =
    useSystemStatus(false);

  return (
    <Alert variant={isError ? "destructive" : "default"}>
      <Server className="h-4 w-4" />
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <AlertTitle className="mb-0 text-sm">
              API Contract &amp; Health Status
            </AlertTitle>
            {isLoading ? (
              <Skeleton className="h-5 w-28" />
            ) : isError ? (
              <Badge variant="warning">API Offline (Local Dev)</Badge>
            ) : (
              <Badge variant="default">
                {data?.status ?? "Healthy"} · v{data?.version ?? "0.1.0"}
              </Badge>
            )}
          </div>
          <AlertDescription>
            {isError ? (
              <>
                Backend API is not currently reachable (
                <span className="font-mono text-[11px]">
                  {error instanceof Error ? error.message : "connection refused"}
                </span>
                ). Start <span className="font-mono text-[11px]">Vaultz.Api</span>{" "}
                on port{" "}
                <span className="tabular-nums font-mono text-[11px]">5180</span>{" "}
                to verify live connectivity.
              </>
            ) : (
              <>
                Connected to{" "}
                <span className="font-mono text-[11px]">
                  {data?.service ?? "Vaultz.Api"}
                </span>{" "}
                ({data?.environment ?? "Development"}) · Database:{" "}
                <span className="font-medium text-[var(--foreground)]">
                  {data?.databaseStatus ?? "Configured"}
                </span>
              </>
            )}
          </AlertDescription>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <div className="mr-1 hidden items-center gap-2 md:flex">
            <Badge variant="neutral" className="gap-1">
              <Activity className="h-3 w-3 text-[var(--accent)]" />
              /api/v1
            </Badge>
            <Badge variant="neutral" className="gap-1 font-mono">
              <Database className="h-3 w-3 text-[var(--accent)]" />
              numeric(19,4)
            </Badge>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
            />
            Recheck
          </Button>
        </div>
      </div>
    </Alert>
  );
}
