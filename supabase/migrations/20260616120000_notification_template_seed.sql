-- Starter e-postmaler for admin varsler-siden.

insert into public.platform_email_templates (key, subject, body_html)
values
  (
    'welcome',
    'Velkommen til Rønningen Manager',
    '<p>Hei {{name}},</p><p>Velkommen til Rønningen Manager. Logg inn for å komme i gang.</p>'
  ),
  (
    'trial_reminder',
    'Prøveperioden utløper snart',
    '<p>Hei {{name}},</p><p>Prøveperioden for {{organization}} utløper {{trial_end_date}}. Oppgrader for å beholde tilgang.</p>'
  ),
  (
    'payment_failed',
    'Betaling mislyktes',
    '<p>Hei {{name}},</p><p>Vi kunne ikke gjennomføre betalingen for {{organization}}. Oppdater betalingsinformasjonen din.</p>'
  )
on conflict (key) do nothing;
