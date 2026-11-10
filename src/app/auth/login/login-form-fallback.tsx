"use client";

import { useTranslation } from "@/i18n/client";

export function LoginFormFallback() {
  const { t } = useTranslation();

  return (
    <main className="flex min-h-[min(100dvh,100svh)] flex-1 flex-col items-center justify-center px-4 py-16 md:px-8 md:py-24">
      <div
        className="size-10 animate-spin rounded-full border-4 border-muted border-t-success"
        role="status"
        aria-label={t("auth.pages.loadingLogin")}
      />
    </main>
  );
}
