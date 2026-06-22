-- Welcome notification should direct new org owners to complete Stripe checkout.

update public.platform_email_templates
set body_html = '<p>Hei {{name}},</p><p>Velkommen til Rønningen Manager. Fullfør Stripe-betalingen for å komme i gang.</p>'
where key = 'welcome';

update public.user_notifications
set
  body = replace(
    body,
    'Logg inn for å komme i gang.',
    'Fullfør Stripe-betalingen for å komme i gang.'
  ),
  action_url = coalesce(action_url, '/app/settings/billing'),
  action_label = coalesce(action_label, 'Fullfør betaling')
where template_key = 'welcome'
  and body like '%Logg inn for å komme i gang%';
