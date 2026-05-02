import { PageShell } from "@/components/shared/page-shell";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full pb-24 md:pb-8">
      <PageShell title="Innstillinger">
        <div
          className={cn(
            "p-8 text-center text-sm text-muted-foreground",
            RN_CARD_SHELL,
          )}
        >
          Skjermen bygges ut videre etter produktkrav.
        </div>
      </PageShell>
    </div>
  );
}
