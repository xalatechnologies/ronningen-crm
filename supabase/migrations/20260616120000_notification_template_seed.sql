-- Starter e-postmaler for admin varsler-siden.

insert into public.platform_email_templates (key, subject, body_html)
values
  (
    'welcome',
    'Velkommen til Event Manager',
    '<p>Hei {{name}},</p><p>Velkommen til Event Manager. Kontoen din er opprettet, og du kan nå sette opp organisasjonen din.</p><p>For å aktivere full tilgang må abonnementet fullføres under <strong>Innstillinger → Fakturering</strong>. Der kan du starte betaling og 30 dagers prøveperiode.</p><p>Har du spørsmål under oppstart, er du velkommen til å ta kontakt med support.</p><p>Vennlig hilsen<br>Event Manager</p>'
  ),
  (
    'trial_reminder',
    'Prøveperioden utløper snart – {{organization}}',
    '<p>Hei {{name}},</p><p>Prøveperioden for {{organization}} utløper {{trial_end_date}}.</p><p>For å unngå avbrudd i tilgangen, fullfør betaling under <strong>Innstillinger → Fakturering</strong> før prøveperioden utløper.</p><p>Vennlig hilsen<br>Event Manager</p>'
  ),
  (
    'payment_failed',
    'Betalingen kunne ikke gjennomføres – {{organization}}',
    '<p>Hei {{name}},</p><p>Vi kunne ikke gjennomføre den siste betalingen for abonnementet til {{organization}}.</p><p>Oppdater betalingsinformasjonen under <strong>Innstillinger → Fakturering</strong> så snart som mulig for å beholde tilgang.</p><p>Dersom du mener dette er en feil, ta kontakt med support.</p><p>Vennlig hilsen<br>Event Manager</p>'
  )
on conflict (key) do nothing;
