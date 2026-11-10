"use client";

import { useTranslation } from "@/i18n/client";
import { AdminConfirmActionDialog } from "@/components/admin/admin-confirm-action-dialog";
import { AdminActionButton } from "@/components/admin/admin-action-button";
import { AdminDetailHeaderMeta } from "@/components/admin/admin-detail-header-meta";
import { AdminDetailTabBar } from "@/components/admin/admin-detail-tab-bar";
import {
  getUserDetailTabs,
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
import { getDateFnsLocale } from "@/i18n/formatters";
import type { Locale } from "@/i18n/config";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type UserDetailHeaderProps = {
  user: AdminUserDetail;
  tab: UserDetailTabId;
  onTabChange: (tab: UserDetailTabId) => void;
  isSelf: boolean;
};

function formatMetaDate(iso: string | null, locale: Locale): string | null {
  if (!iso) return null;
  return format(new Date(iso), "d. MMM yyyy", { locale: getDateFnsLocale(locale) });
}

function AccountStatusBadge({
  isDisabled,
  isSelf,
}: {
  isDisabled: boolean;
  isSelf: boolean;
}) {
  const { t } = useTranslation();
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
        {isDisabled ? t("admin.deaktivert") : t("admin.aktiv_konto")}
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
  const { t } = useTranslation();
  if (!isPlatformAdmin) return null;
  return (
    <span className="inline-flex rounded-md border-2 border-rn-accent-border/50 bg-rn-surface-gradient-from px-2.5 py-0.5 text-app-xs font-semibold text-success md:text-app-sm">{t("admin.plattformadmin")}</span>
  );
}

export function UserDetailHeader({
  user,
  tab,
  onTabChange,
  isSelf,
}: UserDetailHeaderProps) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [accountBusy, setAccountBusy] = useState(false);
  const [disableConfirmOpen, setDisableConfirmOpen] = useState(false);
  const [manualResetLink, setManualResetLink] = useState<{
    email: string;
    link: string;
  } | null>(null);

  const createdLabel = formatMetaDate(user.createdAt, locale);
  const lastSignInLabel = formatMetaDate(user.lastSignInAt, locale);

  const metaItems = [
    createdLabel ? t("adminLabels.fields.registeredAt", { date: createdLabel }) : null,
    lastSignInLabel
      ? t("adminLabels.meta.lastSignInAt", { date: lastSignInLabel })
      : t("admin.aldri_innlogget"),
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
      toast.success(t("admin.tilbakestillingslenke_sendt", { email: result.email }));
      return;
    }
    setManualResetLink({ email: result.email, link: result.link });
  }

  async function copyManualResetLink() {
    if (!manualResetLink) return;
    try {
      await navigator.clipboard.writeText(manualResetLink.link);
      toast.success(t("admin.lenke_kopiert"));
    } catch {
      toast.error(t("admin.kunne_ikke_kopiere_lenken"));
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
    toast.success(t("admin.konto_aktivert"));
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
    toast.success(t("admin.konto_deaktivert"));
    router.refresh();
  }

  const actionsBusy = passwordBusy || accountBusy;

  return (
    <>
      <AppPageHeader
        className="mb-0"
        surface="default"
        compact
        detailLayout
        backLink={{
          href: adminRoutes.users,
          label: t("admin.alle_brukere"),
        }}
        title={user.fullName ?? user.email ?? t("admin.bruker")}
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
              {passwordBusy ? t("admin.sender") : t("admin.send_tilbakestillingslenke")}
            </AdminActionButton>
            {user.isDisabled ? (
              <AdminActionButton
                type="button"
                disabled={actionsBusy || isSelf}
                onClick={() => void handleEnableAccount()}
              >
                {accountBusy ? t("admin.aktiverer") : t("admin.aktiver_konto")}
              </AdminActionButton>
            ) : (
              <AdminActionButton
                type="button"
                variant="destructive"
                disabled={actionsBusy || isSelf}
                onClick={() => setDisableConfirmOpen(true)}
              >
                {t("admin.deaktiver_konto_knapp")}
              </AdminActionButton>
            )}
          </>
        }
        toolbar={
          <AdminDetailTabBar
            tabs={getUserDetailTabs(t)}
            activeTab={tab}
            onTabChange={onTabChange}
            aria-label={t("admin.brukerdetaljer")}
          />
        }
        toolbarClassName="border-0 px-0 py-2.5 sm:py-3"
      />

      <AdminConfirmActionDialog
        open={disableConfirmOpen}
        onOpenChange={(open) => {
          if (!accountBusy) setDisableConfirmOpen(open);
        }}
        title={t("admin.deaktiver_konto")}
        description={t("admin.deaktiver_konto_beskrivelse", {
          name: user.fullName ?? user.email ?? "",
        })}
        confirmLabel={t("admin.ja_deaktiver")}
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
            <DialogTitle>{t("adminLabels.dialogs.copyResetLink")}</DialogTitle>
            <DialogDescription className="app-text text-muted-foreground">
              {t("adminLabels.dialogs.copyResetLinkBody")}{" "}
              {t("admin.kopier_reset_lenke_footer", {
                email: manualResetLink?.email ?? "",
              })}
            </DialogDescription>
          </DialogHeader>
          <Input
            readOnly
            value={manualResetLink?.link ?? ""}
            className="font-mono text-app-xs"
            aria-label={t("admin.tilbakestillingslenke")}
          />
          <DialogFooter className="gap-2 sm:gap-2">
            <AdminActionButton
              type="button"
              onClick={() => setManualResetLink(null)}
            >
              {t("common.actions.close")}
            </AdminActionButton>
            <AdminActionButton
              type="button"
              variant="default"
              onClick={() => void copyManualResetLink()}
            >
              {t("adminLabels.actions.copyLink")}
            </AdminActionButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
