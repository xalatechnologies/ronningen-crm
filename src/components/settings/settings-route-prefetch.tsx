"use client";

import { SETTINGS_SECTIONS } from "@/lib/settings/settings-links";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Warms RSC payloads for settings sub-routes so tab switches feel instant. */
export function SettingsRoutePrefetch() {
  const router = useRouter();

  useEffect(() => {
    for (const section of SETTINGS_SECTIONS) {
      router.prefetch(section.href);
    }
  }, [router]);

  return null;
}
