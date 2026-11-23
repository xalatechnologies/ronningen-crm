"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { KeyRound } from "lucide-react";

import { AccountCard } from "@/features/account/components/account-card";
import { resetCooldownLeft } from "@/features/account/lib/profile-name";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useTranslation } from "@/i18n/client";
import { useSupabase } from "@/providers/supabase-provider";

const COOLDOWN_SECONDS = 60;

/** Sends a one-time link to the person's own e-mail to set a new password; a new link can be asked for after a minute. */
export function PasswordCard({ email }: { email: string }) {
  const { t } = useTranslation();
  const supabase = useSupabase();
  const { user } = useAuthUser();
  const [busy, setBusy] = useState(false);
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const displayEmail = user?.email ?? email;
  const left = resetCooldownLeft(sentAt, now, COOLDOWN_SECONDS);

  useEffect(() => {
    if (sentAt == null || left === 0) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [sentAt, left]);

  async function send() {
    if (!supabase || !displayEmail || left > 0) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(displayEmail, { redirectTo: `${window.location.origin}/auth/login` });
      if (error) {
        toast.error(t("settings.accountForm.sendResetFailed"), { description: error.message });
        return;
      }
      const sent = Date.now();
      setSentAt(sent);
      setNow(sent);
      toast.success(t("settings.accountForm.passwordResetSent"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccountCard
      id="account-security"
      icon={KeyRound}
      title={t("settings.accountForm.password")}
      description={t("settings.accountForm.passwordDescription")}
      footer={
        <Button type="button" variant="outline" disabled={busy || !displayEmail || left > 0} onClick={() => void send()} className="w-full sm:w-auto">
          {busy
            ? t("settings.accountForm.sending")
            : left > 0
              ? t("settings.accountForm.resendIn", { seconds: left })
              : sentAt != null
                ? t("settings.accountForm.sendAgain")
                : t("settings.accountForm.sendResetLink")}
        </Button>
      }
    >
      <p className="text-app-sm leading-relaxed text-muted-foreground">
        {t("settings.accountForm.passwordEmailHint")} <span className="font-medium text-foreground">{displayEmail}</span>. {t("settings.accountForm.passwordLinkHint")}
      </p>
      {sentAt != null ? (
        <p role="status" className="rounded-xl bg-status-success-bg px-4 py-3 text-app-sm text-status-success-text">
          {t("settings.accountForm.resetSentTo", { email: displayEmail })}
        </p>
      ) : null}
    </AccountCard>
  );
}
