export function InitialsAvatar({ name }: { name: string }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
  return (
    <span
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success/10 text-app-xs font-bold text-success dark:bg-white/10 dark:text-white"
      aria-hidden
    >
      {initials || "?"}
    </span>
  );
}
