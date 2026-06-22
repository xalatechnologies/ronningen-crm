type AuthErrorLike = {
  message?: string;
  code?: string;
  status?: number;
};

function includes(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

/**
 * Maps Supabase Auth errors to actionable Norwegian messages for end users.
 */
export function mapAuthErrorToNorwegian(error: AuthErrorLike): string {
  const message = error.message?.trim() ?? "";
  const code = error.code?.trim() ?? "";
  const combined = `${code} ${message}`.toLowerCase();

  if (
    includes(combined, "email rate limit exceeded") ||
    includes(combined, "over_email_send_rate_limit")
  ) {
    return "Vi kan ikke sende flere e-poster akkurat nå (grense hos autentiseringstjenesten). Vent minst én time og prøv igjen, eller kontakt support hvis du allerede har fått en bekreftelsesmail.";
  }

  if (
    includes(combined, "user already registered") ||
    includes(combined, "already been registered") ||
    includes(combined, "already exists")
  ) {
    return "Det finnes allerede en konto med denne e-postadressen. Prøv å logge inn, eller bruk «Glemt passord» hvis du ikke husker passordet.";
  }

  if (
    includes(combined, "invalid login credentials") ||
    includes(combined, "invalid_credentials")
  ) {
    return "Feil e-post eller passord.";
  }

  if (
    includes(combined, "email address") &&
    (includes(combined, "invalid") ||
      includes(combined, "unable to validate") ||
      includes(combined, "not authorized"))
  ) {
    return "E-postadressen ble avvist av autentiseringstjenesten. Kontroller at den er stavet riktig (uten mellomrom), og prøv en annen adresse hvis problemet vedvarer.";
  }

  if (includes(combined, "password") && includes(combined, "weak")) {
    return "Passordet er for svakt. Velg minst 8 tegn.";
  }

  if (
    includes(combined, "signup is disabled") ||
    includes(combined, "signups not allowed")
  ) {
    return "Registrering er midlertidig deaktivert. Kontakt support.";
  }

  if (includes(combined, "failed to fetch") || includes(combined, "network")) {
    return "Får ikke kontakt med autentiseringstjenesten. Sjekk nettverket ditt og prøv igjen.";
  }

  if (message) {
    return message;
  }

  return "Noe gikk galt. Prøv igjen om litt.";
}
