import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";

export function AdminComingSoon({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <AdminPageShell title={title} description={description}>
      <div
        className={cn(
          RN_CARD_SHELL,
          "flex min-h-[16rem] flex-col items-center justify-center gap-2 p-8 text-center",
        )}
      >
        <p className="font-heading text-lg font-semibold text-foreground">
          Kommer snart
        </p>
        <p className="max-w-md text-app-sm text-muted-foreground">
          Denne modulen er planlagt i plattform-backoffice-oppgraderingen.
        </p>
      </div>
    </AdminPageShell>
  );
}
