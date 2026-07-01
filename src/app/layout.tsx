import { AppInitScripts } from "@/components/app-init-scripts";
import { DisplayDensitySync } from "@/components/providers/display-density-sync";
import { Toaster } from "@/components/ui/sonner";
import { APP_NAME } from "@/config/app";
import { displayStorageKey } from "@/config/display";
import { themeStorageKey } from "@/config/theme";
import { I18nProvider } from "@/i18n/client";
import { getServerLocale, getServerTranslation } from "@/i18n/server";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/providers/auth-provider";
import { QueryProvider } from "@/providers/query-provider";
import { SupabaseProvider } from "@/providers/supabase-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerTranslation();
  return {
    title: APP_NAME,
    description: t("common.app.description"),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialLocale = await getServerLocale();

  return (
    <html
      lang={initialLocale}
      data-density="spacious"
      data-theme="light"
      data-scroll-behavior="smooth"
      data-display-storage-key={displayStorageKey}
      data-theme-storage-key={themeStorageKey}
      className={cn(inter.variable, "h-full scroll-smooth antialiased")}
      suppressHydrationWarning
    >
      <body
        className={cn(
          "flex min-h-full flex-col bg-background font-sans text-foreground",
        )}
        suppressHydrationWarning
      >
        <AppInitScripts />
        <SupabaseProvider>
          <AuthProvider>
            <QueryProvider>
              <ThemeProvider>
                <I18nProvider initialLocale={initialLocale}>
                  <DisplayDensitySync />
                  {children}
                  <Toaster />
                </I18nProvider>
              </ThemeProvider>
            </QueryProvider>
          </AuthProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
