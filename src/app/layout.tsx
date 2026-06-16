import { DisplayDensitySync } from "@/components/providers/display-density-sync";
import { Toaster } from "@/components/ui/sonner";
import { APP_DESCRIPTION, APP_NAME } from "@/config/app";
import { displayStorageKey } from "@/config/display";
import { themeStorageKey } from "@/config/theme";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/providers/auth-provider";
import { QueryProvider } from "@/providers/query-provider";
import { SupabaseProvider } from "@/providers/supabase-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import type { Metadata } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-density="spacious"
      data-theme="light"
      data-display-storage-key={displayStorageKey}
      data-theme-storage-key={themeStorageKey}
      className={cn(inter.variable, "h-full scroll-smooth antialiased")}
    >
      <body
        className={cn(
          "flex min-h-full flex-col bg-background font-sans text-foreground",
        )}
      >
        <Script
          id="theme-init"
          src="/theme-init.js"
          strategy="beforeInteractive"
        />
        <Script
          id="display-density-init"
          src="/display-density-init.js"
          strategy="afterInteractive"
        />
        <SupabaseProvider>
          <AuthProvider>
            <QueryProvider>
              <ThemeProvider>
                <DisplayDensitySync />
                {children}
                <Toaster />
              </ThemeProvider>
            </QueryProvider>
          </AuthProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
