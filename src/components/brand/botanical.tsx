import { cn } from "@/lib/utils";

/** Decorative botanical line-art (purely visual, hidden from assistive tech). */
export function BotanicalSprig({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 160"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      className={cn("pointer-events-none select-none", className)}
    >
      <path d="M60 156C58 120 62 80 84 20" />
      <path d="M62 120c-16-4-26-14-28-28 16 0 27 9 28 28Z" />
      <path d="M64 96c16-2 27-12 30-26-16-2-28 7-30 26Z" />
      <path d="M68 70c-14-6-22-17-22-30 15 3 23 14 22 30Z" />
      <path d="M74 48c13-4 21-14 22-27-14 1-22 11-22 27Z" />
      <circle cx="84" cy="16" r="4.5" />
      <path d="M84 8c-3-5-8-4-8 0M92 14c4-3 4-8 0-9M90 22c5 0 8-4 6-8M78 21c-5 1-8-3-6-7" />
    </svg>
  );
}

/** Thin gold rule with a small floral centre, for section breaks. */
export function GoldDivider({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3 text-gold", className)} aria-hidden>
      <span className="gold-rule h-px flex-1" />
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="2.2" />
        <path d="M12 9.8c-2-3-1-6 0-7 1 1 2 4 0 7ZM12 14.2c2 3 1 6 0 7-1-1-2-4 0-7ZM9.8 12c-3 2-6 1-7 0 1-1 4-2 7 0ZM14.2 12c3-2 6-1 7 0-1 1-4 2-7 0Z" />
      </svg>
      <span className="gold-rule h-px flex-1" />
    </div>
  );
}

/** Five-petal blossom; `filled` paints the petals for completed states. */
export function Blossom({ className, filled = false }: { className?: string; filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 32 32"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      className={cn("pointer-events-none select-none", className)}
      fill={filled ? "currentColor" : "none"}
      fillOpacity={filled ? 0.22 : 0}
    >
      {[0, 72, 144, 216, 288].map((r) => (
        <path key={r} transform={`rotate(${r} 16 16)`} d="M16 15C11 11 11 4 16 2c5 2 5 9 0 13Z" />
      ))}
      <circle cx="16" cy="16" r="2.4" fill="currentColor" fillOpacity="1" stroke="none" />
    </svg>
  );
}

/** Big, simple flower made of soft filled petals; meant as a faint background accent. */
export function BigBloom({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" fill="currentColor" aria-hidden focusable="false" className={cn("pointer-events-none select-none", className)}>
      {[0, 60, 120, 180, 240, 300].map((r) => (
        <ellipse key={r} cx="100" cy="52" rx="26" ry="46" transform={`rotate(${r} 100 100)`} fillOpacity="0.55" />
      ))}
      <circle cx="100" cy="100" r="14" fillOpacity="0.9" />
    </svg>
  );
}
