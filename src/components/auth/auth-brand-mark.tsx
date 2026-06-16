import { APP_NAME } from "@/config/app";
import Image from "next/image";

export function AuthBrandMark() {
  return (
    <div
      className="relative size-14 shrink-0 overflow-hidden rounded-md border-2 border-rn-accent-border bg-black shadow-sm md:size-16"
      aria-hidden
    >
      <Image
        src="/event-manager-logo.png"
        alt={APP_NAME}
        fill
        sizes="64px"
        className="object-cover"
        priority
      />
    </div>
  );
}
