"use client";

import { Plus } from "lucide-react";

/**
 * The round "+" in the bottom right corner (above the tab bar) that adds something on a phone, the same as on
 * the guest list, wish list and day plan. Hidden from the tablet size up, where the page shows a normal button.
 */
export function AddFab({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="kb-hide fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-20 flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[#5e1f3d] text-primary-foreground shadow-rn-hero-success ring-2 ring-gold/70 transition-transform active:scale-95 sm:hidden"
    >
      <Plus className="size-7" aria-hidden />
    </button>
  );
}
