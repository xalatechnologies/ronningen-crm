"use client";

import { APP_INIT_INLINE_SCRIPT } from "@/lib/app-init-script";
import { useServerInsertedHTML } from "next/navigation";
import { useRef } from "react";

/**
 * Injects blocking theme/density init into the SSR stream outside the client
 * React tree (avoids React 19 "script tag while rendering" warnings).
 */
export function AppInitScripts() {
  const inserted = useRef(false);

  useServerInsertedHTML(() => {
    if (inserted.current) return null;
    inserted.current = true;

    return (
      <script
        dangerouslySetInnerHTML={{ __html: APP_INIT_INLINE_SCRIPT }}
      />
    );
  });

  return null;
}
