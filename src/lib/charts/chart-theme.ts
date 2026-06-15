import type { ResolvedTheme } from "@/config/theme";

export type ChartColorSet = {
  primary: string;
  secondary: string;
  success: string;
  danger: string;
  warning: string;
  neutral: string;
};

export function getChartColors(resolvedTheme: ResolvedTheme): ChartColorSet {
  if (resolvedTheme === "dark") {
    return {
      primary: "#4ade80",
      secondary: "#85b098",
      success: "#4ade80",
      danger: "#f87171",
      warning: "#f59e0b",
      neutral: "#94a3b8",
    };
  }
  return {
    primary: "#1a4331",
    secondary: "#d9e1de",
    success: "#1a4331",
    danger: "#ba1a1a",
    warning: "#d97706",
    neutral: "#58605e",
  };
}

export const chartTooltipClassNames =
  "rounded-md border border-border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md";

export const chartGridColor = "var(--border)";

export const chartAxisColor = "var(--muted-foreground)";

export function chartBarFillClass(highlight: boolean) {
  return highlight
    ? "bg-success shadow-md ring-2 ring-success/30 ring-offset-1 ring-offset-background"
    : "bg-emerald-500/80 hover:bg-emerald-600 dark:bg-emerald-500/60 dark:hover:bg-emerald-500";
}

export function chartTrackClass() {
  return "bg-muted";
}

export function chartEmptyBarClass() {
  return "h-1.5 w-full shrink-0 rounded-sm bg-muted-foreground/25";
}
