export const appPagesNb = {
  inquiries: { title: "Forespørsler", new: "Ny forespørsel" },
  bookings: { title: "Reservasjoner", new: "Ny reservasjon" },
  customers: { title: "Kunder" },
  pricing: { title: "Priser" },
  finance: { title: "Finans" },
  invoices: { title: "Fakturaer" },
  assets: { title: "Inventar" },
  reports: { title: "Rapporter" },
  overnatting: { title: "Overnatting" },
  dashboard: {
    subscriptionActivated: "Abonnement aktivert. Velkommen!",
  },
  onboarding: {
    title: "Kom i gang",
    createOrg: "Opprett organisasjon",
    createOrgDescription:
      "Gi organisasjonen et navn for å starte. Deretter fyller du inn virksomhetsinfo og registrerer lokaler under Innstillinger.",
  },
  suspended: {
    title: "Tilgang suspendert",
    defaultReason:
      "Organisasjonen er midlertidig suspendert av plattformadministrator.",
    organization: "Organisasjon:",
    contactSupport: "Kontakt support",
    logout: "Logg ut",
  },
  settings: {
    organization: {
      title: "Organisasjon",
      description: "Virksomhetsinfo for {name} — brukes på fakturaer og i appen.",
    },
    account: {
      title: "Min konto",
      description: "Ditt navn og innloggingsinformasjon.",
    },
    team: {
      title: "Team",
      description:
        "Administrer hvem som har tilgang til organisasjonen og deres roller.",
      loadError: "Kunne ikke laste team: {error}",
    },
    support: {
      title: "Support",
      description: "Send meldinger til plattformsupport og følg opp sakene dine.",
    },
  },
} as const;
