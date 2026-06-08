import {
  BarChart3,
  CalendarDays,
  CreditCard,
  FileSpreadsheet,
  Layers,
  Package,
  PieChart,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { APP_NAME } from "@/config/app";

export const LANDING_ROUTES = {
  login: "/auth/login",
  register: "/auth/register",
} as const;

export const LANDING_NAV = [
  { label: "Funksjoner", href: "#funksjoner" },
  { label: "Slik fungerer det", href: "#slik-fungerer-det" },
  { label: "Priser", href: "#priser" },
  { label: "FAQ", href: "#faq" },
] as const;

export const HERO = {
  headline: "Styr lokalet, bookinger og økonomi fra ett enkelt dashboard.",
  subheadline: `${APP_NAME} hjelper lokaler og utleiebedrifter med å holde oversikt over bookinger, kunder, betalinger, priser, utstyr og rapporter — uten rotete regneark.`,
  primaryCta: "Start gratis prøveperiode",
  secondaryCta: "Se funksjoner",
  secondaryHref: "#funksjoner",
  trust: "Ingen kredittkort. 30 dagers gratis prøveperiode.",
} as const;

export const HERO_DEMO_STATS = [
  { label: "Omsetning", value: "kr 128 400", hint: "Denne måneden" },
  { label: "Kommende bookinger", value: "6", hint: "Neste 14 dager" },
  { label: "Ubetalte", value: "kr 24 500", hint: "Utestående" },
] as const;

export const HERO_DEMO_BOOKINGS = [
  { event: "Bryllup", date: "14. jun", status: "Bekreftet" },
  { event: "Konfirmasjon", date: "22. jun", status: "Delvis betalt" },
  { event: "Møte", date: "5. jul", status: "Forespørsel" },
] as const;

export const PROBLEMS: {
  icon: LucideIcon;
  title: string;
  text: string;
}[] = [
  {
    icon: CalendarDays,
    title: "Bookinger er vanskelige å holde styr på",
    text: "Datoer, status og kundedetaljer ligger spredt i e-post og regneark.",
  },
  {
    icon: CreditCard,
    title: "Betalinger blir lett oversett",
    text: "Det er uklart hva som er betalt, delvis betalt eller forfalt.",
  },
  {
    icon: FileSpreadsheet,
    title: "Rapporter tar for lang tid",
    text: "Månedstall og innsikt krever manuell innsamling fra flere kilder.",
  },
];

export const FEATURES: {
  icon: LucideIcon;
  title: string;
  text: string;
}[] = [
  {
    icon: CalendarDays,
    title: "Bookingstyring",
    text: "Samle arrangementer, status og kunder på ett sted.",
  },
  {
    icon: Users,
    title: "Kundeoversikt",
    text: "Historikk, kontaktinfo og notater samlet per kunde.",
  },
  {
    icon: Package,
    title: "Priser og pakker",
    text: "Standardiser tilbud med faste pakker og tjenester.",
  },
  {
    icon: Wallet,
    title: "Betalingsoppfølging",
    text: "Se betalt, gjenstående og forfalte beløp tydelig.",
  },
  {
    icon: Layers,
    title: "Utstyr og eiendeler",
    text: "Hold oversikt over utstyr knyttet til lokaler og arrangementer.",
  },
  {
    icon: PieChart,
    title: "Rapporter og innsikt",
    text: "Få bedre kontroll på omsetning, hendelsestyper og utestående.",
  },
];

export const HOW_IT_WORKS = [
  { step: 1, title: "Legg inn booking", text: "Registrer arrangement, kunde og dato." },
  { step: 2, title: "Velg pakke og pris", text: "Knytt booking til pakker og tjenester." },
  { step: 3, title: "Følg opp betaling", text: "Oppdater betalt beløp og status løpende." },
  { step: 4, title: "Se rapporter", text: "Få oversikt over tall og trender i dashboardet." },
] as const;

export const PRODUCT_PREVIEW = [
  {
    title: "Bookinger",
    icon: CalendarDays,
    bullets: [
      "Kalenderklar bookingoversikt",
      "Kundedetaljer samlet",
      "Status fra forespørsel til bekreftet",
    ],
  },
  {
    title: "Økonomi",
    icon: Wallet,
    bullets: [
      "Inntekter og utgifter",
      "Betalt og ubetalt beløp",
      "Oversikt per lokale",
    ],
  },
  {
    title: "Rapporter",
    icon: BarChart3,
    bullets: [
      "Månedlig omsetning",
      "Innsikt per arrangementstype",
      "Utestående betalinger",
    ],
  },
] as const;

export const AUDIENCE = [
  "Bryllupslokaler",
  "Selskapslokaler",
  "Forsamlingshus",
  "Eventlokaler",
  "Eiendomseiere",
  "Utleiebedrifter",
] as const;

export const BENEFITS = [
  "Erstatt regneark-kaos med ett dashboard",
  "Se ubetalte bookinger med én gang",
  "Hold kundehistorikk ryddig og tilgjengelig",
  "Standardiser pakker og priser",
  "Forstå omsetningstrender raskere",
  "Bygget med SaaS-struktur for videre vekst",
] as const;

export const PRICING_PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: "499",
    description: "For små lokaler",
    recommended: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "999",
    description: "For voksende bedrifter",
    recommended: true,
  },
  {
    id: "business",
    name: "Business",
    price: "1 999",
    description: "For flere lokasjoner",
    recommended: false,
  },
] as const;

export const FAQ_ITEMS = [
  {
    question: "Hvem er dette for?",
    answer:
      "Eventlokaler, utleiebedrifter, eiendomseiere og team som håndterer bookinger, kunder, betalinger og rapporter.",
  },
  {
    question: "Trenger jeg kredittkort for å starte?",
    answer:
      "Nei. Den planlagte prøveperioden gir deg 30 dager til å teste systemet før du velger plan.",
  },
  {
    question: "Kan jeg administrere flere lokaler?",
    answer:
      "Ja. SaaS-versjonen er bygget for å støtte flere lokaler og organisasjoner.",
  },
  {
    question: "Er dataene mine adskilt fra andre kunder?",
    answer:
      "Ja. Hver organisasjon har isolerte data med tilgangskontroll per leietaker.",
  },
  {
    question: "Kan jeg eksportere rapporter?",
    answer:
      "Rapportering og eksport er planlagt som en del av dashboardet i produktet.",
  },
] as const;

export const FINAL_CTA = {
  title: "Klar for å erstatte regneark med et ekte driftsverktøy?",
  text: "Start med et ryddig dashboard for bookinger, kunder, betalinger, utstyr og rapporter.",
  primaryCta: "Start gratis prøveperiode",
  secondaryCta: "Logg inn",
} as const;

export const FOOTER = {
  description:
    "Booking-, kunde- og økonomistyring for lokaler og utleiebedrifter — samlet i ett dashboard.",
} as const;

export const SECTION_TITLES = {
  problem: "Slutt å drive lokalet med spredte regneark.",
  features: "Alt lokalet trenger — på ett sted.",
  howItWorks: "Enkel arbeidsflyt fra forespørsel til rapport.",
  productPreview: "Bygget for daglig drift — ikke bare regnskap.",
  audience: "Laget for lokaler og utleiebedrifter.",
  benefits: "Mindre manuelt arbeid. Bedre kontroll.",
  pricing: "Start enkelt. Oppgrader når du vokser.",
  faq: "Ofte stilte spørsmål",
} as const;

export const PRICING_DISCLAIMER_DEV =
  "Fakturering er ikke aktivert i dette forhåndsvisningsmiljøet.";
