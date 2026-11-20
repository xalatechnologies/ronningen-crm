"use client";

import { useTranslation } from "@/i18n/client";

/** First focusable element: lets keyboard users jump past the sidebar and header. */
export function SkipLink({ targetId = "main-content" }: { targetId?: string }) {
  const { t } = useTranslation();
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:left-3 focus-visible:top-3 focus-visible:z-[100] focus-visible:rounded-xl focus-visible:bg-card focus-visible:px-4 focus-visible:py-2.5 focus-visible:text-app-sm focus-visible:font-semibold focus-visible:text-foreground focus-visible:shadow-lg focus-visible:ring-2 focus-visible:ring-success"
    >
      {t("common.skipToContent")}
    </a>
  );
}
