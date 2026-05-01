import { Button } from "@/components/ui/button";

export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-md)] border border-destructive/30 bg-destructive/5 p-6">
      <h3 className="text-sm font-medium text-destructive">{title}</h3>
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
      {onRetry ? (
        <Button variant="outline" size="sm" type="button" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
