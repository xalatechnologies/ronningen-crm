import { Skeleton } from "@/components/ui/skeleton";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";

function HeaderSkeleton({ withToolbar = false }: { withToolbar?: boolean }) {
  return (
    <div
      className={cn(
        RN_CARD_SHELL,
        "mb-8 overflow-hidden bg-card shadow-rn-card",
      )}
    >
      <div className="flex flex-col justify-between gap-4 p-[length:var(--app-card-padding)] md:flex-row md:items-center">
        <div className="min-w-0 flex-1 space-y-3">
          <Skeleton className="h-8 w-48 max-w-full md:h-9 md:w-56" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-11 w-28 rounded-[length:var(--app-radius)]" />
          <Skeleton className="h-11 w-36 rounded-[length:var(--app-radius)]" />
        </div>
      </div>
      {withToolbar ? (
        <div className="border-t border-rn-border-strong/50 p-[length:var(--app-card-padding)]">
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-10 w-32 rounded-[length:var(--app-radius)]" />
            <Skeleton className="h-10 w-40 rounded-[length:var(--app-radius)]" />
            <Skeleton className="h-10 flex-1 min-w-[12rem] rounded-[length:var(--app-radius)]" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function KpiStripSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(RN_CARD_SHELL, "bg-card p-5 shadow-rn-card md:p-6")}
        >
          <Skeleton className="mb-3 h-4 w-24" />
          <Skeleton className="h-8 w-32" />
        </div>
      ))}
    </div>
  );
}

function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className={cn(RN_CARD_SHELL, "overflow-hidden bg-card shadow-rn-card")}>
      <div className="space-y-0 border-b border-rn-border-strong/50 p-4">
        <Skeleton className="h-4 w-full max-w-lg" />
      </div>
      <div className="divide-y divide-rn-border-strong/40">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-4 md:px-6">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-40 max-w-full" />
              <Skeleton className="h-3 w-56 max-w-full" />
            </div>
            <Skeleton className="hidden h-4 w-20 sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className={cn(RN_CARD_SHELL, "bg-card p-4 shadow-rn-card md:p-6")}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Skeleton className="h-9 w-9 rounded-[length:var(--app-radius)]" />
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-9 w-9 rounded-[length:var(--app-radius)]" />
      </div>
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }).map((_, i) => (
          <Skeleton
            key={i}
            className="aspect-square w-full rounded-[length:var(--app-radius)]"
          />
        ))}
      </div>
    </div>
  );
}

export function AppPageSkeleton({
  variant = "table",
}: {
  variant?: "table" | "dashboard" | "calendar" | "kpi";
}) {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      role="status"
      aria-live="polite"
      aria-label="Laster side"
    >
      <HeaderSkeleton withToolbar={variant === "table" || variant === "calendar"} />
      {variant === "dashboard" ? (
        <>
          <KpiStripSkeleton />
          <div className="grid gap-6 lg:grid-cols-2">
            <TableSkeleton rows={4} />
            <TableSkeleton rows={4} />
          </div>
        </>
      ) : null}
      {variant === "kpi" ? <KpiStripSkeleton count={6} /> : null}
      {variant === "calendar" ? <CalendarSkeleton /> : null}
      {variant === "table" ? <TableSkeleton /> : null}
    </div>
  );
}
