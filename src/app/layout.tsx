import { DisplayDensityScript } from "@/components/providers/display-density-script";
import { DisplayDensitySync } from "@/components/providers/display-density-sync";
import { Toaster } from "@/components/ui/sonner";
import { APP_DESCRIPTION, APP_NAME } from "@/config/app";
import { cn } from "@/lib/utils";
import { QueryProvider } from "@/providers/query-provider";
import { SupabaseProvider } from "@/providers/supabase-provider";
import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-heading",
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
      className={cn(
        inter.variable,
        manrope.variable,
        "h-full scroll-smooth antialiased",
      )}
    >
      <body
        className={cn(
          "flex min-h-full flex-col bg-background font-sans text-foreground",
        )}
      >
        <DisplayDensityScript />
        <SupabaseProvider>
          <QueryProvider>
            <DisplayDensitySync />
            {children}
            <Toaster />
          </QueryProvider>
        </SupabaseProvider>
      </body>
    </html>
  );
}
