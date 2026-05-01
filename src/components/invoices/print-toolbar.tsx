"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export function InvoicePrintToolbar() {
  return (
    <div className="print:hidden fixed inset-x-0 bottom-0 z-50 flex justify-center border-t border-border bg-background/95 p-4 backdrop-blur-sm">
      <Button
        type="button"
        className="gap-2 rounded-xl border-2 border-rn-accent-border bg-success text-white hover:bg-rn-accent-fill-hover"
        onClick={() => window.print()}
      >
        <Printer className="size-4" aria-hidden />
        Skriv ut eller lagre som PDF
      </Button>
    </div>
  );
}
