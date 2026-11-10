"use client";

import { useTranslation } from "@/i18n/client";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { useCallback } from "react";

export function InvoicePrintToolbar({ documentTitle }: { documentTitle: string }) {
  const { t } = useTranslation();

  const openPrint = useCallback(() => {
    const prev = document.title;
    document.title = documentTitle;

    const restoreTitle = () => {
      document.title = prev;
      window.removeEventListener("afterprint", restoreTitle);
    };
    window.addEventListener("afterprint", restoreTitle);

    window.print();

    window.setTimeout(() => {
      if (document.title === documentTitle) {
        restoreTitle();
      }
    }, 2_000);
  }, [documentTitle]);

  return (
    <div className="print:hidden fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 px-4 py-4 backdrop-blur-md sm:px-6">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
          <Button
            type="button"
            variant="success"
            size="cta"
            onClick={openPrint}
          >
            <Download className="size-4 shrink-0" aria-hidden />
            {t("invoices.printToolbar.saveAsPdf")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 gap-2 rounded-md border-2 border-rn-border-strong px-5 font-heading text-base font-semibold"
            onClick={openPrint}
          >
            <Printer className="size-4 shrink-0" aria-hidden />
            {t("common.actions.print")}
          </Button>
        </div>
        <p className="text-center text-xs leading-snug text-muted-foreground sm:max-w-[240px] sm:text-right">
          {t("invoices.printToolbar.dialogHintPrefix")}{" "}
          <span className="font-semibold text-foreground">
            {t("invoices.printToolbar.saveAsPdf")}
          </span>{" "}
          {t("invoices.printToolbar.dialogHintSafari")}{" "}
          <span className="font-semibold text-foreground">PDF</span>{" "}
          {t("invoices.printToolbar.dialogHintPdf")}
        </p>
      </div>
    </div>
  );
}
