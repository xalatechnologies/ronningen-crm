import { APP_NAME } from "@/config/app";
import { cn } from "@/lib/utils";

/**
 * Event Manager mark: an "E" built from a booking timeline. The spine is the
 * calendar edge, the three arms are bookings, and the shorter sage arm is the
 * open slot.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={APP_NAME}
      className={cn("size-full", className)}
    >
      <rect width="48" height="48" rx="12" fill="#1a4331" />
      <rect x="13" y="12" width="6" height="24" rx="3" fill="#ffffff" />
      <rect x="13" y="12" width="22" height="6" rx="3" fill="#ffffff" />
      <rect x="19" y="21" width="10" height="6" rx="3" fill="#85b098" />
      <rect x="13" y="30" width="22" height="6" rx="3" fill="#ffffff" />
    </svg>
  );
}

type BrandLockupProps = {
  className?: string;
  /** "light" = dark text for light backgrounds, "dark" = white text for dark backgrounds. */
  tone?: "light" | "dark";
  markClassName?: string;
};

/** Mark plus wordmark ("Event" heavy, "Manager" lighter). */
export function BrandLockup({
  className,
  tone = "light",
  markClassName,
}: BrandLockupProps) {
  const [first, ...rest] = APP_NAME.split(" ");
  const light = tone === "light";

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className={cn("block size-10 shrink-0 md:size-11", markClassName)}>
        <BrandMark />
      </span>
      <span
        className={cn(
          "font-heading text-[19px] leading-none tracking-[-0.03em]",
          light ? "text-[#0c1f16]" : "text-white",
        )}
      >
        <span className="font-extrabold">{first}</span>{" "}
        <span
          className={cn(
            "font-medium",
            light ? "text-[#1a4331]" : "text-[#b9d3c4]",
          )}
        >
          {rest.join(" ")}
        </span>
      </span>
    </span>
  );
}
