export const integrationsNb = {
  stripe: {
    label: "Stripe",
    webhooksLabel: "Stripe webhooks",
    billingDisabled: "Fakturering deaktivert i dette miljøet",
    billingDisabledRunbook:
      "Aktiver NEXT_PUBLIC_BILLING_ENABLED og BILLING_ENABLED når du skal ta i bruk betaling.",
    keysMissing: "Fakturering aktivert, men Stripe-nøkler mangler",
    keysMissingRunbook:
      "Sett STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY og STRIPE_PRICE_STANDARD (eller STRIPE_PRICE_ID). Kjør npm run stripe:setup for å opprette pris.",
    webhookMissing: "Stripe-nøkler er satt, men STRIPE_WEBHOOK_SECRET mangler",
    webhookMissingRunbook:
      "Registrer webhook mot /api/webhooks/stripe og sett STRIPE_WEBHOOK_SECRET. Lokalt: stripe listen --forward-to localhost:3000/api/webhooks/stripe",
    configured: "Betaling og webhooks er konfigurert",
    monitorWebhooks: "Overvåk webhook-aktivitet under Systemhelse.",
    noWebhooksYet: "Ingen webhooks mottatt ennå",
    lastWebhookHours: "Siste webhook for {hours} timer siden",
    verifyWebhook:
      "Verifiser webhook-endepunkt og at Stripe sender hendelser til produksjon.",
  },
  cron: {
    label: "Bakgrunnsjobber",
    secretMissing: "CRON_SECRET er ikke satt",
    secretMissingRunbook:
      "Generer en hemmelighet og sett CRON_SECRET. Planlegg daglig kjøring av billing-enforcement via Vercel Cron eller ekstern scheduler.",
    configured: "Cron-autentisering er konfigurert",
    confirmDaily:
      "Bekreft at billing-enforcement kjører daglig. Se siste kjøringer under Systemhelse.",
    awaitingFirstRun: "Venter på første kjøring av billing-enforcement",
    awaitingFirstRunbook:
      "Utløs cron manuelt eller vent på første planlagte kjøring. Sjekk platform_job_runs i Systemhelse.",
    lastRunFailed: "Siste billing-enforcement feilet",
    lastRunStale: "Siste kjøring for {hours} timer siden (for gammel)",
    lastRunOk: "Siste kjøring for {hours} timer siden ({status})",
    investigateFailed:
      "Undersøk feilloggen under Systemhelse og rett miljø/Stripe-problemer.",
    verifyScheduler:
      "Verifiser at cron-scheduler kjører og at CRON_SECRET matcher produksjon.",
  },
  email: {
    label: "E-post (Resend)",
    configured: "Transaksjonell e-post er konfigurert",
    missing: "RESEND_API_KEY eller RESEND_FROM_EMAIL mangler",
    configuredRunbook: "E-post brukes til varsler og transaksjonelle meldinger.",
    missingRunbook:
      "Opprett konto på Resend, verifiser domene, og sett RESEND_API_KEY og RESEND_FROM_EMAIL.",
  },
  supabaseAdmin: {
    label: "Supabase admin",
    configured: "Service role-nøkkel er satt",
    missing: "SUPABASE_SERVICE_ROLE_KEY mangler",
    configuredRunbook:
      "Bruk kun server-side. Roter nøkkel ved mistanke om lekkasje.",
    missingRunbook:
      "Hent service role key fra Supabase Project Settings → API og sett SUPABASE_SERVICE_ROLE_KEY.",
  },
  appUrl: {
    label: "App-URL",
    configured: "NEXT_PUBLIC_APP_URL er satt",
    missing: "NEXT_PUBLIC_APP_URL mangler eller er ugyldig",
    configuredRunbook: "Brukes til Stripe redirect-URL-er og lenker i e-post.",
    missingRunbook:
      "Sett NEXT_PUBLIC_APP_URL til produksjonsdomenet (f.eks. https://app.example.com).",
  },
  envGroups: {
    core: "Kjerne",
    app: "App",
    billing: "Fakturering",
    email: "E-post",
    cron: "Cron",
  },
  envChecklist: {
    supabaseAnonDesc: "Anon/publishable nøkkel for klient",
    stripeSecretDesc: "Stripe hemmelig nøkkel",
    monthlySubscription: "Månedlig abonnement",
    resendApiDesc: "Resend API-nøkkel",
    notificationsAndEmail: "Varsler og e-post",
    senderAddress: "Avsenderadresse",
    supabaseUrlDesc: "Supabase-prosjekt URL",
    supabaseUrlRequiredFor: "Database og autentisering",
    supabaseAnonRequiredFor: "Innlogging i appen",
    serviceRoleDesc: "Server-side admin-tilgang",
    serviceRoleRequiredFor: "Admin og bakgrunnsjobber",
    appUrlDesc: "Offentlig app-adresse",
    appUrlRequiredFor: "Stripe redirects og e-postlenker",
    billingClientDesc: "Klient-side billing-flagg",
    billingClientRequiredFor: "Abonnementsflyt",
    billingServerDesc: "Server-side billing-flagg",
    billingServerRequiredFor: "Stripe og cron",
    stripePublishableDesc: "Stripe publishable key",
    stripePublishableRequiredFor: "Checkout i nettleser",
    webhookSecretDesc: "Webhook-signatur",
    webhookSecretRequiredFor: "Abonnementssynk",
    billingModeDesc: "sandbox eller live",
    billingModeRequiredFor: "Stripe test vs produksjon",
    stripePriceDesc: "Stripe pris-ID (standard plan)",
    stripeProductDesc: "Stripe produkt-ID (valgfri)",
    stripeProductRequiredFor: "Admin-visning",
    stripePriceLegacyDesc: "Legacy pris-ID (alias)",
    cronSecretDesc: "Autentisering for cron-endepunkter",
    cronSecretRequiredFor: "Billing-enforcement",
    paymentRequiredFor: "Betaling",
    groupSetCount: "{set}/{total} satt",
    groupMissingCount: "· {count} mangler",
    resetFilter: "Nullstill filter",
    securityHint: "Kun status vises — aldri hemmelige verdier.",
    visibleCount: "{visible} av {total} variabler vises",
  },
} as const;

export const integrationsEn = {
  stripe: {
    label: "Stripe",
    webhooksLabel: "Stripe webhooks",
    billingDisabled: "Billing disabled in this environment",
    billingDisabledRunbook:
      "Enable NEXT_PUBLIC_BILLING_ENABLED and BILLING_ENABLED when you want to use payments.",
    keysMissing: "Billing enabled, but Stripe keys are missing",
    keysMissingRunbook:
      "Set STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY and STRIPE_PRICE_STANDARD (or STRIPE_PRICE_ID). Run npm run stripe:setup to create a price.",
    webhookMissing: "Stripe keys are set, but STRIPE_WEBHOOK_SECRET is missing",
    webhookMissingRunbook:
      "Register webhook to /api/webhooks/stripe and set STRIPE_WEBHOOK_SECRET. Locally: stripe listen --forward-to localhost:3000/api/webhooks/stripe",
    configured: "Payments and webhooks are configured",
    monitorWebhooks: "Monitor webhook activity under System health.",
    noWebhooksYet: "No webhooks received yet",
    lastWebhookHours: "Last webhook {hours} hours ago",
    verifyWebhook:
      "Verify webhook endpoint and that Stripe sends events to production.",
  },
  cron: {
    label: "Background jobs",
    secretMissing: "CRON_SECRET is not set",
    secretMissingRunbook:
      "Generate a secret and set CRON_SECRET. Schedule daily billing-enforcement via Vercel Cron or external scheduler.",
    configured: "Cron authentication is configured",
    confirmDaily:
      "Confirm billing-enforcement runs daily. See recent runs under System health.",
    awaitingFirstRun: "Waiting for first billing-enforcement run",
    awaitingFirstRunbook:
      "Trigger cron manually or wait for first scheduled run. Check platform_job_runs under System health.",
    lastRunFailed: "Last billing-enforcement failed",
    lastRunStale: "Last run {hours} hours ago (too old)",
    lastRunOk: "Last run {hours} hours ago ({status})",
    investigateFailed:
      "Investigate error log under System health and fix environment/Stripe issues.",
    verifyScheduler:
      "Verify cron scheduler is running and CRON_SECRET matches production.",
  },
  email: {
    label: "Email (Resend)",
    configured: "Transactional email is configured",
    missing: "RESEND_API_KEY or RESEND_FROM_EMAIL is missing",
    configuredRunbook: "Email is used for notifications and transactional messages.",
    missingRunbook:
      "Create a Resend account, verify domain, and set RESEND_API_KEY and RESEND_FROM_EMAIL.",
  },
  supabaseAdmin: {
    label: "Supabase admin",
    configured: "Service role key is set",
    missing: "SUPABASE_SERVICE_ROLE_KEY is missing",
    configuredRunbook: "Use server-side only. Rotate key if leak is suspected.",
    missingRunbook:
      "Get service role key from Supabase Project Settings → API and set SUPABASE_SERVICE_ROLE_KEY.",
  },
  appUrl: {
    label: "App URL",
    configured: "NEXT_PUBLIC_APP_URL is set",
    missing: "NEXT_PUBLIC_APP_URL is missing or invalid",
    configuredRunbook: "Used for Stripe redirect URLs and email links.",
    missingRunbook:
      "Set NEXT_PUBLIC_APP_URL to production domain (e.g. https://app.example.com).",
  },
  envGroups: {
    core: "Core",
    app: "App",
    billing: "Billing",
    email: "Email",
    cron: "Cron",
  },
  envChecklist: {
    supabaseAnonDesc: "Anon/publishable key for client",
    stripeSecretDesc: "Stripe secret key",
    monthlySubscription: "Monthly subscription",
    resendApiDesc: "Resend API key",
    notificationsAndEmail: "Notifications and email",
    senderAddress: "Sender address",
    supabaseUrlDesc: "Supabase project URL",
    supabaseUrlRequiredFor: "Database and authentication",
    supabaseAnonRequiredFor: "Sign-in in the app",
    serviceRoleDesc: "Server-side admin access",
    serviceRoleRequiredFor: "Admin and background jobs",
    appUrlDesc: "Public app URL",
    appUrlRequiredFor: "Stripe redirects and email links",
    billingClientDesc: "Client-side billing flag",
    billingClientRequiredFor: "Subscription flow",
    billingServerDesc: "Server-side billing flag",
    billingServerRequiredFor: "Stripe and cron",
    stripePublishableDesc: "Stripe publishable key",
    stripePublishableRequiredFor: "Checkout in browser",
    webhookSecretDesc: "Webhook signature",
    webhookSecretRequiredFor: "Subscription sync",
    billingModeDesc: "sandbox or live",
    billingModeRequiredFor: "Stripe test vs production",
    stripePriceDesc: "Stripe price ID (standard plan)",
    stripeProductDesc: "Stripe product ID (optional)",
    stripeProductRequiredFor: "Admin display",
    stripePriceLegacyDesc: "Legacy price ID (alias)",
    cronSecretDesc: "Authentication for cron endpoints",
    cronSecretRequiredFor: "Billing enforcement",
    paymentRequiredFor: "Payment",
    groupSetCount: "{set}/{total} set",
    groupMissingCount: "· {count} missing",
    resetFilter: "Reset filter",
    securityHint: "Only status is shown — never secret values.",
    visibleCount: "{visible} of {total} variables shown",
  },
} as const;
