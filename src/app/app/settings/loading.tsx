import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div
      className="flex flex-col gap-6"
      role="status"
      aria-live="polite"
      aria-label="Laster innstillinger"
    >
      <div className="space-y-2">
        <Skeleton className="h-8 w-44 max-w-full" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </div>
      <div className="space-y-4 rounded-md border-2 border-rn-border-strong bg-card p-6 shadow-rn-card">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}
