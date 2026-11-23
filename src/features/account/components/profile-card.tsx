"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserRound } from "lucide-react";

import { AccountCard, Field } from "@/features/account/components/account-card";
import { PROFILE_NAME_MAX, isNameChanged, normalizeProfileName, profileNameError } from "@/features/account/lib/profile-name";
import { useAuthUser } from "@/hooks/use-auth-user";
import { useTranslation } from "@/i18n/client";
import { useSupabase } from "@/providers/supabase-provider";

type Props = { initialFullName: string; email: string };

/** The signed-in person's name (editable) and e-mail (read only). The name is saved to their own profile row. */
export function ProfileCard({ initialFullName, email }: Props) {
  const { t } = useTranslation();
  const supabase = useSupabase();
  const router = useRouter();
  const { user } = useAuthUser();
  const [saved, setSaved] = useState(initialFullName);
  const [fullName, setFullName] = useState(initialFullName);
  const [busy, setBusy] = useState(false);
  const changed = isNameChanged(fullName, saved);
  const tooLong = profileNameError(fullName) === "too_long";
  const displayEmail = user?.email ?? email;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!supabase || !user || !changed || tooLong) return;
    setBusy(true);
    try {
      const name = normalizeProfileName(fullName);
      const { error } = await supabase.from("profiles").update({ full_name: name || null }).eq("id", user.id);
      if (error) {
        toast.error(t("settings.accountForm.saveFailed"), { description: error.message });
        return;
      }
      setSaved(name);
      setFullName(name);
      toast.success(t("settings.accountForm.profileUpdated"));
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(event) => void save(event)} noValidate className="flex">
      <AccountCard
        id="account-profile"
        icon={UserRound}
        title={t("settings.accountForm.profile")}
        description={t("settings.accountForm.profileDescription")}
        className="w-full"
        footer={
          <Button type="submit" variant="success" disabled={busy || !changed || tooLong} className="w-full sm:w-auto">
            {busy ? t("settings.accountForm.saving") : t("settings.accountForm.saveName")}
          </Button>
        }
      >
        <Field label={t("settings.accountForm.fullName")} htmlFor="acct-name">
          <Input
            id="acct-name"
            value={fullName}
            maxLength={PROFILE_NAME_MAX + 20}
            autoComplete="name"
            aria-invalid={tooLong ? true : undefined}
            aria-describedby={tooLong ? "acct-name-error" : undefined}
            onChange={(e) => setFullName(e.target.value)}
            className="h-11"
          />
          {tooLong ? (
            <p id="acct-name-error" role="alert" className="text-app-xs text-destructive">
              {t("settings.accountForm.nameTooLong", { max: PROFILE_NAME_MAX })}
            </p>
          ) : null}
        </Field>
        <Field
          label={t("settings.accountForm.email")}
          htmlFor="acct-email"
          hint={
            <>
              {t("settings.accountForm.emailChangeHint")}{" "}
              <Link href="/app/settings/support" className="font-semibold text-success hover:underline dark:!text-white">
                {t("settings.accountForm.goToSupport")}
              </Link>{" "}
              {t("settings.accountForm.emailChangeSuffix")}
            </>
          }
        >
          <Input id="acct-email" value={displayEmail} readOnly disabled className="h-11 bg-muted/40 text-muted-foreground" />
        </Field>
      </AccountCard>
    </form>
  );
}
