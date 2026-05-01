"use client";

import { useEffect } from "react";

/**
 * Legger til klasse på <html> slik @media print kan skjule shell (sidebar/header).
 */
export default function InvoicesPrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    document.documentElement.classList.add("invoice-print-shell");
    return () => {
      document.documentElement.classList.remove("invoice-print-shell");
    };
  }, []);
  return <>{children}</>;
}
