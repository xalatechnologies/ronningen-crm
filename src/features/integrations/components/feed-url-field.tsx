"use client";

import { Copy, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/i18n/client";

type Props = {
  /** What is shown in the field: the full address, or the masked one. */
  displayValue: string;
  revealed: boolean;
  onToggleReveal: () => void;
  onCopy: () => void;
};

/** The feed address with show/hide and copy. Copy always copies the full address, even while masked. */
export function FeedUrlField({ displayValue, revealed, onToggleReveal, onCopy }: Props) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="calendar-feed-url" className="text-app-xs font-semibold text-muted-foreground">
        {t("settings.integrations.calendarFeed.urlLabel")}
      </Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id="calendar-feed-url"
          readOnly
          value={displayValue}
          onFocus={(event) => event.currentTarget.select()}
          className="h-11 font-mono text-xs sm:text-sm"
        />
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="h-11" onClick={onToggleReveal} aria-pressed={revealed}>
            {revealed ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
            {revealed ? t("settings.integrations.calendarFeed.hide") : t("settings.integrations.calendarFeed.reveal")}
          </Button>
          <Button type="button" variant="success" className="h-11" onClick={onCopy}>
            <Copy className="size-4" aria-hidden />
            {t("settings.integrations.calendarFeed.copy")}
          </Button>
        </div>
      </div>
    </div>
  );
}
