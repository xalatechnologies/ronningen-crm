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
      primary: "#7db4ff",
      secondary: "#93acff",
      success: "#5fe0a0",
      danger: "#ff9d92",
      warning: "#f4c95d",
      neutral: "#97a6b8",
    };
  }
  return {
    primary: "#3d62cf",
    secondary: "#c9d6f7",
    success: "#226b59",
    danger: "#ad3d49",
    warning: "#c98a2e",
    neutral: "#5f6f85",
  };
}

export const chartTooltipClassNames =
  "rounded-md border border-border bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md";

export const chartGridColor = "var(--border)";

export const chartAxisColor = "var(--muted-foreground)";

export function chartBarFillClass(highlight: boolean) {
  return highlight
    ? "bg-success shadow-md ring-2 ring-success/30 ring-offset-1 ring-offset-background"
    : "bg-success/45 hover:bg-success/70 dark:bg-success/60 dark:hover:bg-success/80";
}

export function chartTrackClass() {
  return "bg-muted";
}

export function chartEmptyBarClass() {
  return "h-1.5 w-full shrink-0 rounded-sm bg-muted-foreground/25";
}
