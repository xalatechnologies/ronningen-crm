"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus } from "lucide-react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { FormSelect } from "@/components/ui/form-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/i18n/client";
import { RN_CARD_SHELL } from "@/lib/rn-ui";
import { cn } from "@/lib/utils";
import { teamMemberAddSchema, type TeamMemberAddInput } from "@/lib/validations";

type Props = {
  roleOptions: Array<{ value: string; label: string }>;
  /** Sends the invitation. Resolves true when it went through, so the form can clear. */
  onInvite: (data: TeamMemberAddInput) => Promise<boolean>;
};

const DEFAULTS: TeamMemberAddInput = { email: "", role: "manager" };

export function InviteForm({ roleOptions, onInvite }: Props) {
  const { t } = useTranslation();
  const form = useForm<TeamMemberAddInput>({ resolver: zodResolver(teamMemberAddSchema), defaultValues: DEFAULTS });
  const { errors, isSubmitting } = form.formState;

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(async (data) => {
        if (await onInvite(data)) form.reset(DEFAULTS);
      })}
      className={cn("flex flex-col gap-4 p-5 md:p-6", RN_CARD_SHELL)}
    >
      <div>
        <h2 className="font-heading text-lg font-bold">{t("settings.team.inviteTitle")}</h2>
        <p className="mt-1 text-app-sm text-muted-foreground">{t("settings.team.inviteDescription")}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_13rem_auto] md:items-end">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="team-email" className="text-app-xs font-semibold text-muted-foreground">
            {t("common.fields.email")}
          </Label>
          <Input
            id="team-email"
            type="email"
            autoComplete="off"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? "team-email-error" : undefined}
            className="h-12 min-h-12 w-full rounded-xl border border-foreground/25"
            {...form.register("email")}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="team-role" className="text-app-xs font-semibold text-muted-foreground">
            {t("settings.team.role")}
          </Label>
          <FormSelect
            id="team-role"
            value={form.watch("role")}
            onValueChange={(v) => form.setValue("role", v as TeamMemberAddInput["role"])}
            options={roleOptions}
            className="h-12 min-h-12 w-full"
          />
        </div>
        <Button type="submit" variant="success" disabled={isSubmitting} className="h-12 min-h-12 gap-2 px-5 font-semibold">
          <UserPlus className="size-5 shrink-0" aria-hidden />
          {t("settings.team.inviteButton")}
        </Button>
      </div>
      {errors.email ? (
        <p id="team-email-error" role="alert" className="-mt-2 text-app-sm text-destructive">
          {errors.email.message}
        </p>
      ) : null}
    </form>
  );
}
