/** Canonical platform e-postmaler (nøkkel, emne, HTML). */
export const DEFAULT_EMAIL_TEMPLATES = [
  {
    key: "welcome",
    subject: "Velkommen til Event Manager",
    bodyHtml: `<p>Hei {{name}},</p>
<p>Velkommen til Event Manager. Kontoen din er opprettet, og du kan nå bruke appen med en gratis prøveperiode.</p>
<p>Du trenger ikke betalingskort i starten. Når prøveperioden nærmer seg slutten, kan du legge til betaling under <strong>Innstillinger → Fakturering</strong>.</p>
<p>Har du spørsmål under oppstart, er du velkommen til å ta kontakt med support.</p>
<p>Vennlig hilsen<br>Event Manager</p>`,
  },
  {
    key: "trial_reminder",
    subject: "Prøveperioden utløper snart – {{organization}}",
    bodyHtml: `<p>Hei {{name}},</p>
<p>Prøveperioden for {{organization}} utløper {{trial_end_date}}.</p>
<p>Legg til betaling under <strong>Innstillinger → Fakturering</strong> før prøveperioden utløper for å unngå avbrudd i tilgangen.</p>
<p>Vennlig hilsen<br>Event Manager</p>`,
  },
  {
    key: "payment_failed",
    subject: "Betalingen kunne ikke gjennomføres – {{organization}}",
    bodyHtml: `<p>Hei {{name}},</p>
<p>Vi kunne ikke gjennomføre den siste betalingen for abonnementet til {{organization}}.</p>
<p>Oppdater betalingsinformasjonen under <strong>Innstillinger → Fakturering</strong> så snart som mulig for å beholde tilgang.</p>
<p>Dersom du mener dette er en feil, ta kontakt med support.</p>
<p>Vennlig hilsen<br>Event Manager</p>`,
  },
] as const;

export const EMAIL_TEMPLATE_LABELS: Record<string, string> = {
  welcome: "Velkomst til ny kunde",
  trial_reminder: "Påminnelse om prøveperiode",
  payment_failed: "Mislykket betaling",
};

export function formatEmailTemplateLabel(key: string): string {
  return EMAIL_TEMPLATE_LABELS[key] ?? key;
}
