import { AppBrandLogo } from "@/components/brand/app-brand-logo";

export function AuthBrandMark() {
  return (
    <div
      className="relative size-14 shrink-0 overflow-hidden rounded-md border-2 border-rn-accent-border bg-black shadow-sm md:size-16"
      aria-hidden
    >
      <AppBrandLogo sizes="64px" priority />
    </div>
  );
}
