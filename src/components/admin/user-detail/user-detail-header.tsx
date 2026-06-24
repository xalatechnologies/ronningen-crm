"use client";

import { AdminConfirmActionDialog } from "@/components/admin/admin-confirm-action-dialog";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { AdminDetailHeaderMeta } from "@/components/admin/admin-detail-header-meta";
import { AdminDetailTabBar } from "@/components/admin/admin-detail-tab-bar";
import {
  USER_DETAIL_TABS,
  type UserDetailTabId,
} from "@/components/admin/user-detail/tabs";
import { AppPageHeader } from "@/components/layout/app-page-header";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { adminRoutes } from "@/config/admin-routes";
import {
  disableUserAccount,
  enableUserAccount,
  initiatePasswordReset,
} from "@/lib/admin/actions/users-admin";
import type { AdminUserDetail } from "@/lib/admin/queries/users-billing-audit";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { nb } from "date-fns/locale/nb";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type UserDetailHeaderProps = {
  user: AdminUserDetail;
  tab: UserDetailTabId;
  onTabChange: (tab: UserDetailTabId) => void;
  isSelf: boolean;
};

function formatMetaDate(iso: string | null): string | null {
  if (!iso) return null;
  return format(new Date(iso), "d. MMM yyyy", { locale: nb });
}

function AccountStatusBadge({
  isDisabled,
  isSelf,
}: {
  isDisabled: boolean;
  isSelf: boolean;
}) {
  return (
    <>
      <span
        className={cn(
          "inline-flex rounded-md border-2 px-2.5 py-0.5 text-app-xs font-semibold md:text-app-sm",
          isDisabled
            ? "border-destructive/40 bg-destructive/10 text-destructive"
            : "border-success/40 bg-success/10 text-success",
        )}
      >
        {isDisabled ? "Deaktivert" : "Aktiv konto"}
      </span>
      {isSelf ? (
        <span className="inline-flex rounded-md border-2 border-rn-border-strong bg-muted/30 px-2.5 py-0.5 text-app-xs font-semibold text-muted-foreground md:text-app-sm">
          Dette er deg
        </span>
      ) : null}
    </>
  );
}

function PlatformAdminBadge({ isPlatformAdmin }: { isPlatformAdmin: boolean }) {
  if (!isPlatformAdmin) return null;
  return (
    <span className="inline-flex rounded-md border-2 border-rn-accent-border/50 bg-rn-surface-gradient-from px-2.5 py-0.5 text-app-xs font-semibold text-success md:text-app-sm">
      Plattformadmin
    </span>
  );
}

export function UserDetailHeader({
  user,
  tab,
  onTabChange,
  isSelf,
}: UserDetailHeaderProps) {
  const router = useRouter();
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [accountBusy, setAccountBusy] = useState(false);
  const [disableConfirmOpen, setDisableConfirmOpen] = useState(false);
  const [manualResetLink, setManualResetLink] = useState<{
    email: string;
    link: string;
  } | null>(null);

  const createdLabel = formatMetaDate(user.createdAt);
  const lastSignInLabel = formatMetaDate(user.lastSignInAt);

  const metaItems = [
    createdLabel ? `Registrert ${createdLabel}` : null,
    lastSignInLabel
      ? `Sist innlogget ${lastSignInLabel}`
      : "Aldri innlogget",
  ].filter((item): item is string => Boolean(item));

  async function handlePasswordReset() {
    setPasswordBusy(true);
    const result = await initiatePasswordReset(user.id);
    setPasswordBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    if (result.method === "email") {
      toast.success(`Tilbakestillingslenke sendt til ${result.email}`);
      return;
    }
    setManualResetLink({ email: result.email, link: result.link });
  }

  async function copyManualResetLink() {
    if (!manualResetLink) return;
    try {
      await navigator.clipboard.writeText(manualResetLink.link);
      toast.success("Lenke kopiert");
    } catch {
      toast.error("Kunne ikke kopiere lenken");
    }
  }

  async function handleEnableAccount() {
    setAccountBusy(true);
    const result = await enableUserAccount(user.id);
    setAccountBusy(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Konto aktivert");
    router.refresh();
  }

  async function handleDisableAccount() {
    setAccountBusy(true);
    const result = await disableUserAccount(user.id);
    setAccountBusy(false);
    setDisableConfirmOpen(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Konto deaktivert");
    router.refresh();
  }

  const actionsBusy = passwordBusy || accountBusy;

  return (
    <>
      <AppPageHeader
        surface="card"
        compact
        detailLayout
        backLink={{
          href: adminRoutes.users,
          label: "Alle brukere",
        }}
        title={user.fullName ?? user.email ?? "Bruker"}
        description={
          <AdminDetailHeaderMeta
            lead={
              user.email && user.fullName ? user.email : undefined
            }
            items={metaItems}
            badges={
              <>
                <AccountStatusBadge
                  isDisabled={user.isDisabled}
                  isSelf={isSelf}
                />
                <PlatformAdminBadge isPlatformAdmin={user.isPlatformAdmin} />
              </>
            }
          />
        }
        actions={
          <>
            <AdminActionButton
              type="button"
              disabled={actionsBusy || isSelf}
              onClick={() => void handlePasswordReset()}
            >
              {passwordBusy ? "Sender…" : "Send tilbakestillingslenke"}
            </AdminActionButton>
            {user.isDisabled ? (
              <AdminActionButton
                type="button"
                disabled={actionsBusy || isSelf}
                onClick={() => void handleEnableAccount()}
              >
                {accountBusy ? "Aktiverer…" : "Aktiver konto"}
              </AdminActionButton>
            ) : (
              <AdminActionButton
                type="button"
                variant="destructive"
                disabled={actionsBusy || isSelf}
                onClick={() => setDisableConfirmOpen(true)}
              >
                Deaktiver konto
              </AdminActionButton>
            )}
          </>
        }
        toolbar={
          <AdminDetailTabBar
            tabs={USER_DETAIL_TABS}
            activeTab={tab}
            onTabChange={onTabChange}
            aria-label="Brukerdetaljer"
          />
        }
        toolbarClassName="py-2.5 sm:py-3"
      />

      <AdminConfirmActionDialog
        open={disableConfirmOpen}
        onOpenChange={(open) => {
          if (!accountBusy) setDisableConfirmOpen(open);
        }}
        title="Deaktiver konto?"
        description={
          <>
            <strong>{user.fullName ?? user.email}</strong> kan ikke logge inn
            etter deaktivering. Du kan aktivere kontoen igjen senere.
          </>
        }
        confirmLabel="Ja, deaktiver"
        confirmVariant="destructive"
        busy={accountBusy}
        onConfirm={() => void handleDisableAccount()}
      />

      <Dialog
        open={manualResetLink !== null}
        onOpenChange={(open) => {
          if (!open) setManualResetLink(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Kopier tilbakestillingslenke</DialogTitle>
            <DialogDescription className="app-text text-muted-foreground">
              Supabase kunne ikke sende e-post automatisk. Kopier lenken og send
              den manuelt til{" "}
              <strong>{manualResetLink?.email}</strong> (f.eks. via support).
            </DialogDescription>
          </DialogHeader>
          <Input
            readOnly
            value={manualResetLink?.link ?? ""}
            className="font-mono text-app-xs"
            aria-label="Tilbakestillingslenke"
          />
          <DialogFooter className="gap-2 sm:gap-2">
            <AdminActionButton
              type="button"
              onClick={() => setManualResetLink(null)}
            >
              Lukk
            </AdminActionButton>
            <AdminActionButton
              type="button"
              variant="default"
              onClick={() => void copyManualResetLink()}
            >
              Kopier lenke
            </AdminActionButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
