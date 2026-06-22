-- Remove test/junk templates and campaigns; replace system templates with professional copy.

delete from public.platform_notification_deliveries
where campaign_id in (
  select id
  from public.platform_notification_campaigns
  where template_key in ('Feil med betaling', 'Warning', 'welcome to event manager')
);

delete from public.platform_notification_campaigns
where template_key in ('Feil med betaling', 'Warning', 'welcome to event manager');

delete from public.platform_email_templates
where key in ('Feil med betaling', 'Warning', 'welcome to event manager');

update public.platform_email_templates
set
  subject = 'Velkommen til Event Manager',
  body_html = '<p>Hei {{name}},</p><p>Velkommen til Event Manager. Kontoen din er opprettet, og du kan nå sette opp organisasjonen din.</p><p>For å aktivere full tilgang må abonnementet fullføres under <strong>Innstillinger → Fakturering</strong>. Der kan du starte betaling og 30 dagers prøveperiode.</p><p>Har du spørsmål under oppstart, er du velkommen til å ta kontakt med support.</p><p>Vennlig hilsen<br>Event Manager</p>',
  updated_at = now()
where key = 'welcome';

update public.platform_email_templates
set
  subject = 'Prøveperioden utløper snart – {{organization}}',
  body_html = '<p>Hei {{name}},</p><p>Prøveperioden for {{organization}} utløper {{trial_end_date}}.</p><p>For å unngå avbrudd i tilgangen, fullfør betaling under <strong>Innstillinger → Fakturering</strong> før prøveperioden utløper.</p><p>Vennlig hilsen<br>Event Manager</p>',
  updated_at = now()
where key = 'trial_reminder';

update public.platform_email_templates
set
  subject = 'Betalingen kunne ikke gjennomføres – {{organization}}',
  body_html = '<p>Hei {{name}},</p><p>Vi kunne ikke gjennomføre den siste betalingen for abonnementet til {{organization}}.</p><p>Oppdater betalingsinformasjonen under <strong>Innstillinger → Fakturering</strong> så snart som mulig for å beholde tilgang.</p><p>Dersom du mener dette er en feil, ta kontakt med support.</p><p>Vennlig hilsen<br>Event Manager</p>',
  updated_at = now()
where key = 'payment_failed';

update public.user_notifications
set
  title = 'Velkommen til Event Manager',
  body = replace(
    replace(
      body,
      'Velkommen til Rønningen Manager. Fullfør Stripe-betalingen for å komme i gang.',
      'Velkommen til Event Manager. For å aktivere full tilgang må abonnementet fullføres under Innstillinger → Fakturering.'
    ),
    'Velkommen til Rønningen Manager. Logg inn for å komme i gang.',
    'Velkommen til Event Manager. For å aktivere full tilgang må abonnementet fullføres under Innstillinger → Fakturering.'
  )
where template_key = 'welcome';
