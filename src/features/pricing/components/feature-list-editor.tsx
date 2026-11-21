"use client";


import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CheckCircle2, Plus, X } from "lucide-react";
import { useTranslation } from "@/i18n/client";
import { useRef } from "react";



export const dialogFieldClass =
  "h-12 rounded-xl border border-foreground/25 bg-background px-4 text-base shadow-none hover:border-foreground/40 focus-visible:border-success focus-visible:ring-3 focus-visible:ring-success/20";

export function FeatureListEditor({
  features,
  onChange,
}: {
  features: string[];
  onChange: (next: string[]) => void;
}) {
  const { t } = useTranslation();
  const listRef = useRef<HTMLDivElement>(null);

  function focusRow(index: number) {
    window.setTimeout(() => {
      listRef.current
        ?.querySelectorAll<HTMLInputElement>("input[data-feature-input]")
        [index]?.focus();
    }, 0);
  }

  return (
    <div className="space-y-2">
      <Label>{t("pricing.featuresLabel")}</Label>
      <div ref={listRef} className="space-y-2">
        {features.map((feature, index) => (
          <div key={index} className="flex items-center gap-2">
            <CheckCircle2 className="size-5 shrink-0 text-success" aria-hidden />
            <Input
              data-feature-input
              value={feature}
              placeholder={t("pricing.featurePlaceholder")}
              className={cn(dialogFieldClass, "h-11")}
              onChange={(e) =>
                onChange(features.map((f, i) => (i === index ? e.target.value : f)))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const next = [...features];
                  next.splice(index + 1, 0, "");
                  onChange(next);
                  focusRow(index + 1);
                } else if (e.key === "Backspace" && feature === "" && features.length > 1) {
                  e.preventDefault();
                  onChange(features.filter((_, i) => i !== index));
                  focusRow(Math.max(0, index - 1));
                }
              }}
            />
            <button
              type="button"
              className="flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              aria-label={t("pricing.removeFeatureAria", { number: index + 1 })}
              onClick={() => {
                const next = features.filter((_, i) => i !== index);
                onChange(next.length > 0 ? next : [""]);
              }}
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5 rounded-xl shadow-none"
        onClick={() => {
          onChange([...features, ""]);
          focusRow(features.length);
        }}
      >
        <Plus className="size-4" aria-hidden />
        {t("pricing.addFeature")}
      </Button>
      <p className="text-xs text-muted-foreground">{t("pricing.featuresHint")}</p>
    </div>
  );
}
