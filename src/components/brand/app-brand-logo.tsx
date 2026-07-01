"use client";

import { APP_NAME } from "@/config/app";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useState } from "react";

const LOGO_SRC = "/event-manager-logo.png";

type AppBrandLogoProps = {
  className?: string;
  sizes?: string;
  priority?: boolean;
};

export function AppBrandLogo({
  className,
  sizes = "(min-width: 768px) 64px, 56px",
  priority = false,
}: AppBrandLogoProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={cn(
          "flex size-full items-center justify-center bg-black font-heading text-app-xs font-bold uppercase tracking-tight text-white",
          className,
        )}
        aria-hidden
      >
        EM
      </div>
    );
  }

  return (
    <Image
      src={LOGO_SRC}
      alt={APP_NAME}
      fill
      sizes={sizes}
      className={cn("object-cover", className)}
      priority={priority}
      unoptimized
      onError={() => setFailed(true)}
    />
  );
}
