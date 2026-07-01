export const authNb = {
  login: "Logg inn",
  register: "Registrer",
  forgotPassword: "Glemt passord",
  resetPassword: "Tilbakestill passord",
  email: "E-post",
  password: "Passord",
  fullName: "Fullt navn",
  confirmPassword: "Bekreft passord",
  logout: "Logg ut",
  noAccount: "Har du ikke konto?",
  hasAccount: "Har du allerede konto?",
  createAccount: "Opprett konto",
  sendResetLink: "Send tilbakestillingslenke",
  backToLogin: "Tilbake til innlogging",
  platformAdminDev: "Plattformadmin (lokal utvikling)",
  platformAdmin: "Plattformadmin",
  errors: {
    emailRateLimit:
      "Vi kan ikke sende flere e-poster akkurat nå (grense hos autentiseringstjenesten). Vent minst én time og prøv igjen, eller kontakt support hvis du allerede har fått en bekreftelsesmail.",
    userAlreadyRegistered:
      "Det finnes allerede en konto med denne e-postadressen. Prøv å logge inn, eller bruk «Glemt passord» hvis du ikke husker passordet.",
    invalidCredentials: "Feil e-post eller passord.",
    invalidEmail:
      "E-postadressen ble avvist av autentiseringstjenesten. Kontroller at den er stavet riktig (uten mellomrom), og prøv en annen adresse hvis problemet vedvarer.",
    weakPassword: "Passordet er for svakt. Velg minst 8 tegn.",
    signupDisabled: "Registrering er midlertidig deaktivert. Kontakt support.",
    network:
      "Får ikke kontakt med autentiseringstjenesten. Sjekk nettverket ditt og prøv igjen.",
    generic: "Noe gikk galt. Prøv igjen om litt.",
  },
  pages: {
    backToHome: "Tilbake til forsiden",
    loginTagline: "{appName} — administrasjon av lokaler, bookinger og økonomi.",
    loggingIn: "Logger inn …",
    loadingLogin: "Laster innlogging …",
    supabaseNotConfigured: "Supabase er ikke konfigurert.",
    registerTagline: "Registrer deg for å bruke {appName}.",
    registerFailed: "Registrering feilet. Prøv igjen.",
    namePlaceholder: "For- og etternavn",
    forgotTagline:
      "{appName} — skriv inn e-posten din. Du får en lenke til å velge nytt passord hvis kontoen finnes.",
    resetEmailSent:
      "Hvis det finnes en konto for denne adressen, har vi sendt en lenke for å nullstille passordet.",
    supabaseConnectionError:
      "Får ikke kontakt med Supabase. Sjekk NEXT_PUBLIC_SUPABASE_URL i .env.local, nettverk/VPN og at prosjektet ikke er pauset.",
    supabaseConfigMissing:
      "Supabase URL og offentlig API-nøkkel mangler. Opprett .env.local med NEXT_PUBLIC_SUPABASE_URL og enten NEXT_PUBLIC_SUPABASE_ANON_KEY (eldre JWT) eller NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (ny «Publishable»-nøkkel) fra Supabase (Settings → API), og start npm run dev på nytt.",
    supabaseConfigBanner:
      "Opprett {envFile} i prosjektmappen med {urlKey} og {anonKey} (eldre JWT) eller {publishableKey} (ny «Publishable»-nøkkel fra Supabase), hentet under Settings → API. Deretter {restartDev} slik at Next.js leser inn variablene.",
    restartDevServer: "start dev-serveren på nytt",
  },
} as const;

export const rolesNb = {
  owner: "Hovedeier",
  admin: "Administrator",
  manager: "Leder",
  accountant: "Regnskap",
  viewer: "Lesertilgang",
  platformAdmin: "Plattformadmin",
} as const;

export const statusesNb = {
  active: "Aktiv",
  trialing: "Prøveperiode",
  pastDue: "Forfalt",
  canceled: "Kansellert",
  incomplete: "Ufullstendig",
  suspended: "Suspendert",
  confirmed: "Bekreftet",
  pending: "Avventer",
  cancelled: "Avbestilt",
  paid: "Betalt",
  unpaid: "Ubetalt",
  overdue: "Forfalt",
  partial: "Delvis betalt",
  draft: "Utkast",
  new: "Ny",
  contacted: "Kontaktet",
  quoteSent: "Tilbud sendt",
  awaitingCustomer: "Venter på svar",
  converted: "Konvertert til reservasjon",
  tentative: "Foreløpig",
  won: "Vunnet",
  lost: "Tapt",
  waived: "Ettergitt / makulert",
  disputed: "Under tvist",
  other: "Annet",
  inquiry: "Forespørsel",
  inactive: "Inaktiv",
} as const;

export const formsNb = {
  required: "Dette feltet er påkrevd",
  invalidEmail: "Ugyldig e-postadresse",
  invalidPhone: "Ugyldig telefonnummer",
  invalidAmount: "Ugyldig beløp",
  mustBePositive: "Må være større enn null",
  dateRequired: "Dato er påkrevd",
  endDateAfterStart: "Sluttdato må være etter startdato",
  passwordTooShort: "Passordet må være minst 8 tegn",
  passwordsMismatch: "Passordene er ikke like",
  emailRequired: "E-post er påkrevd",
  nameRequired: "Navn er påkrevd",
  orgNumberInvalid: "Ugyldig organisasjonsnummer",
  urlInvalid: "Ugyldig URL",
} as const;
