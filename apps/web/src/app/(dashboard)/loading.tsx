import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Page Header Skeleton */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-32 rounded-lg" />
        </div>
      </div>

      {/* Metric Cards Skeleton Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </div>
            <Skeleton className="h-7 w-32 my-1" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>

      {/* Main Content / Table Shell Skeleton */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="space-y-3 pt-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
