import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const out = execSync(
  `rg -o '"[A-ZÆØÅ][^"]{3,}"' src/components/admin src/app/admin --no-filename`,
  { encoding: "utf8" },
);
const strings = [
  ...new Set(
    out
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((s) => s.slice(1, -1)),
  ),
].sort();

function toKey(s) {
  return s
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 60);
}

const EXACT_EN = {
  "ARR (estimat)": "ARR (estimate)",
  "Abonnement": "Subscription",
  "Abonnement og inntekt": "Subscriptions and revenue",
  "Abonnement og oppfølging": "Subscriptions and follow-up",
  "Abonnement og prising": "Subscriptions and pricing",
  "Abonnement synkronisert": "Subscription synced",
  "Abonnementsstatus oppdatert": "Subscription status updated",
  "Administratorer": "Administrators",
  "Advarsel": "Warning",
  "Advarsel (forfalt)": "Warning (past due)",
  "Aktiv": "Active",
  "Aktiv konto": "Active account",
  "Aktive": "Active",
  "Aktive brukere (30 d.)": "Active users (30 d.)",
  "Aktive globalt": "Active globally",
  "Aktive kampanjer": "Active campaigns",
  "Aktive plattformadministratorer": "Active platform administrators",
  "Aktiver": "Enable",
  "Aktiver globalt": "Enable globally",
  "Aktiver globalt?": "Enable globally?",
  "Aktiver konto": "Enable account",
  "Aktiverer…": "Enabling…",
  "Aktivert": "Enabled",
  "Aldri": "Never",
  "Aldri innlogget": "Never signed in",
  "Alle": "All",
  "Alle brukere": "All users",
  "Alle handlinger": "All actions",
  "Alle organisasjoner": "All organizations",
  "Alle support-saker": "All support tickets",
  "Angi en begrunnelse": "Enter a reason",
  "Angi et gyldig antall dager": "Enter a valid number of days",
  "Angi organisasjons-ID": "Enter organization ID",
  "Avsluttet": "Ended",
  "Bekreft": "Confirm",
  "Betaling forsøkt": "Payment retried",
  "Betalt abonnement": "Paid subscription",
  "Bookinger (30 d.)": "Bookings (30 d.)",
  "Bruk": "Use",
  "Bruker": "User",
  "Brukerdetaljer": "User details",
  "Brukere": "Users",
  "Churn (30 d.)": "Churn (30 d.)",
  "Deaktiver": "Disable",
  "Deaktivert": "Disabled",
  "E-post": "Email",
  "Eksporter CSV": "Export CSV",
  "Enterprise": "Enterprise",
  "Fakturering": "Billing",
  "Feilet": "Failed",
  "Forfalt": "Past due",
  "Forfalt betaling": "Past due payment",
  "Fra dato": "From date",
  "Full tilgang": "Full access",
  "Funksjonsflagg": "Feature flags",
  "Gi plattformadmin": "Grant platform admin",
  "Inaktiv": "Inactive",
  "Inaktive": "Inactive",
  "Infrastruktur": "Infrastructure",
  "Ingen": "None",
  "Inntekt": "Revenue",
  "Integrasjoner": "Integrations",
  "Ja, deaktiver": "Yes, disable",
  "Ja, fjern": "Yes, remove",
  "Ja, slett permanent": "Yes, delete permanently",
  "Ja, suspendér": "Yes, suspend",
  "Kjerne": "Core",
  "Kommersielt": "Commercial",
  "Konto": "Account",
  "Kontostatus": "Account status",
  "Kritisk": "Critical",
  "Kun fakturering": "Billing only",
  "Kunde": "Customer",
  "Kunder": "Customers",
  "Løst": "Resolved",
  "MRR (est.)": "MRR (est.)",
  "Nei": "No",
  "Ny": "New",
  "Organisasjon": "Organization",
  "Organisasjoner": "Organizations",
  "Plattformadmin": "Platform admin",
  "Prøveperiode": "Trial",
  "Send": "Send",
  "Standard": "Standard",
  "Starter": "Starter",
  "Pro": "Pro",
  "Business": "Business",
  "Support": "Support",
  "Suspendert": "Suspended",
  "Søk": "Search",
  "Team": "Team",
  "Tilbake": "Back",
  "Til dato": "To date",
  "Totalt": "Total",
  "Åpen": "Open",
  "Venter": "Waiting",
  "Feil": "Bug",
  "Ønske": "Feature request",
  "Annet": "Other",
  "Tilgang": "Access",
  "Enter": "Enter",
  "Cron": "Cron",
};

function translateNbToEn(nb) {
  if (EXACT_EN[nb]) return EXACT_EN[nb];

  let en = nb
    .replace(/organisasjoner/gi, "organizations")
    .replace(/organisasjon/gi, "organization")
    .replace(/brukere/gi, "users")
    .replace(/bruker/gi, "user")
    .replace(/abonnement/gi, "subscription")
    .replace(/prøveperiode/gi, "trial")
    .replace(/prøvende/gi, "trialing")
    .replace(/forfalt/gi, "past due")
    .replace(/suspendert/gi, "suspended")
    .replace(/suspendér/gi, "suspend")
    .replace(/suspendere/gi, "suspend")
    .replace(/innlogget/gi, "signed in")
    .replace(/innlogging/gi, "sign-in")
    .replace(/e-post/gi, "email")
    .replace(/fakturering/gi, "billing")
    .replace(/betaling/gi, "payment")
    .replace(/inntekt/gi, "revenue")
    .replace(/bookinger/gi, "bookings")
    .replace(/booking/gi, "booking")
    .replace(/kunder/gi, "customers")
    .replace(/kunde/gi, "customer")
    .replace(/support/gi, "support")
    .replace(/revisjon/gi, "audit")
    .replace(/varsler/gi, "notifications")
    .replace(/varsel/gi, "notification")
    .replace(/kampanje/gi, "campaign")
    .replace(/mal/gi, "template")
    .replace(/funksjonsflagg/gi, "feature flag")
    .replace(/plattformadmin/gi, "platform admin")
    .replace(/administrator/gi, "administrator")
    .replace(/innstillinger/gi, "settings")
    .replace(/eksporter/gi, "export")
    .replace(/filtrer/gi, "filter")
    .replace(/ingen /gi, "no ")
    .replace(/Ingen /g, "No ")
    .replace(/alle /gi, "all ")
    .replace(/Alle /g, "All ")
    .replace(/aktiv/gi, "active")
    .replace(/deaktiver/gi, "disable")
    .replace(/aktiver/gi, "enable")
    .replace(/lagre/gi, "save")
    .replace(/slett/gi, "delete")
    .replace(/oppdater/gi, "update")
    .replace(/opprett/gi, "create")
    .replace(/kunne ikke/gi, "could not")
    .replace(/Kunne ikke/g, "Could not")
    .replace(/…/g, "…");

  if (en === nb && /[æøåÆØÅ]/.test(nb)) {
    en = nb
      .replace(/æ/g, "ae")
      .replace(/ø/g, "o")
      .replace(/å/g, "a")
      .replace(/Æ/g, "Ae")
      .replace(/Ø/g, "O")
      .replace(/Å/g, "A");
  }
  return en;
}

const seen = new Set();
const adminNb = {};
const adminEn = {};

for (const nb of strings) {
  let k = toKey(nb);
  let i = 2;
  while (seen.has(k)) k = `${toKey(nb)}_${i++}`;
  seen.add(k);
  adminNb[k] = nb;
  adminEn[k] = translateNbToEn(nb);
}

writeFileSync(
  "src/i18n/dictionaries/parts/admin.ts",
  `export const adminNb = ${JSON.stringify(adminNb, null, 2)} as const;\n\nexport const adminEn = ${JSON.stringify(adminEn, null, 2)} as const;\n`,
);
console.log(`Wrote ${Object.keys(adminNb).length} admin keys`);
