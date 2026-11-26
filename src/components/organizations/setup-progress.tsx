import { cn } from "@/lib/utils";

type Props = {
  /** Step labels in order. */
  steps: string[];
  /** 1-based number of the step the user is on. */
  current: number;
  /** "Step 1 of 3", already translated. */
  label: string;
};

/** Shows where the user is in the first-time setup: a bar per step, the current one filled, and its name. */
export function SetupProgress({ steps, current, label }: Props) {
  return (
    <div className="space-y-3">
      <ol className="flex gap-2" aria-label={label}>
        {steps.map((step, index) => {
          const number = index + 1;
          return (
            <li key={step} className="flex-1 space-y-1.5" aria-current={number === current ? "step" : undefined}>
              <span className={cn("block h-1.5 rounded-full", number <= current ? "bg-success" : "bg-border")} aria-hidden />
              <span className={cn("block text-app-xs", number === current ? "font-semibold text-foreground" : "text-muted-foreground")}>
                {step}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="text-app-sm text-muted-foreground">{label}</p>
    </div>
  );
}
