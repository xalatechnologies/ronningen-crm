import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";
import type { TranslationKey, Translator } from "@/i18n/types";
import { getDefaultT } from "@/lib/i18n/default-messages";

const TEMPLATE_LABEL_KEYS: Record<string, TranslationKey> = {
  welcome: "notifications.emailTemplates.welcome",
  trial_reminder: "notifications.emailTemplates.trialReminder",
  payment_failed: "notifications.emailTemplates.paymentFailed",
};

const TEMPLATE_SUBJECT_KEYS: Record<string, TranslationKey> = {
  welcome: "notifications.defaultSubjects.welcome",
  trial_reminder: "notifications.defaultSubjects.trialReminder",
  payment_failed: "notifications.defaultSubjects.paymentFailed",
};

const TEMPLATE_BODY_NB: Record<string, string> = {
  welcome: `<p>Hei {{name}},</p>
<p>Velkommen til Event Manager. Kontoen din er opprettet, og du kan nå bruke appen med en gratis prøveperiode.</p>
<p>Du trenger ikke betalingskort i starten. Når prøveperioden nærmer seg slutten, kan du legge til betaling under <strong>Innstillinger → Fakturering</strong>.</p>
<p>Har du spørsmål under oppstart, er du velkommen til å ta kontakt med support.</p>
<p>Vennlig hilsen<br>Event Manager</p>`,
  trial_reminder: `<p>Hei {{name}},</p>
<p>Prøveperioden for {{organization}} utløper {{trial_end_date}}.</p>
<p>Legg til betaling under <strong>Innstillinger → Fakturering</strong> før prøveperioden utløper for å unngå avbrudd i tilgangen.</p>
<p>Vennlig hilsen<br>Event Manager</p>`,
  payment_failed: `<p>Hei {{name}},</p>
<p>Vi kunne ikke gjennomføre den siste betalingen for abonnementet til {{organization}}.</p>
<p>Oppdater betalingsinformasjonen under <strong>Innstillinger → Fakturering</strong> så snart som mulig for å beholde tilgang.</p>
<p>Dersom du mener dette er en feil, ta kontakt med support.</p>
<p>Vennlig hilsen<br>Event Manager</p>`,
};

const TEMPLATE_BODY_EN: Record<string, string> = {
  welcome: `<p>Hi {{name}},</p>
<p>Welcome to Event Manager. Your account has been created and you can now use the app with a free trial.</p>
<p>You do not need a payment card at first. When the trial is nearing its end, you can add payment under <strong>Settings → Billing</strong>.</p>
<p>If you have questions during onboarding, feel free to contact support.</p>
<p>Best regards<br>Event Manager</p>`,
  trial_reminder: `<p>Hi {{name}},</p>
<p>The trial for {{organization}} ends on {{trial_end_date}}.</p>
<p>Add payment under <strong>Settings → Billing</strong> before the trial ends to avoid interruption.</p>
<p>Best regards<br>Event Manager</p>`,
  payment_failed: `<p>Hi {{name}},</p>
<p>We could not process the latest payment for {{organization}}'s subscription.</p>
<p>Update your payment details under <strong>Settings → Billing</strong> as soon as possible to keep access.</p>
<p>If you believe this is an error, please contact support.</p>
<p>Best regards<br>Event Manager</p>`,
};

export function getDefaultEmailTemplates(locale: Locale = "nb") {
  const t = createTranslator(getDictionary(locale));
  const bodies = locale === "en" ? TEMPLATE_BODY_EN : TEMPLATE_BODY_NB;

  return (["welcome", "trial_reminder", "payment_failed"] as const).map((key) => ({
    key,
    subject: t(TEMPLATE_SUBJECT_KEYS[key]!),
    bodyHtml: bodies[key]!,
  }));
}

/** Canonical platform e-postmaler (nøkkel, emne, HTML). */
export const DEFAULT_EMAIL_TEMPLATES = getDefaultEmailTemplates("nb");

export function formatEmailTemplateLabel(
  key: string,
  t: Translator,
): string {
  const labelKey = TEMPLATE_LABEL_KEYS[key];
  return labelKey ? t(labelKey) : key;
}

/** @deprecated Use formatEmailTemplateLabel(key, t) */
export const EMAIL_TEMPLATE_LABELS: Record<string, string> = Object.fromEntries(
  (["welcome", "trial_reminder", "payment_failed"] as const).map((key) => [
    key,
    formatEmailTemplateLabel(key, getDefaultT()),
  ]),
);
