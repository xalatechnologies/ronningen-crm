import { Skeleton } from "@/components/ui/skeleton";

export function LoadingState({
  label = "Loading…",
}: {
  label?: string;
}) {
  return (
    <div
      className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-border bg-card p-4"
      role="status"
      aria-live="polite"
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-2/3" />
    </div>
  );
}
