export type LandingLocale = "nb" | "en";

export const STAGE_COUNT = 4;

/** Amount already paid at each booking stage, out of BOOKING_TOTAL (kr). */
export const BOOKING_TOTAL = 62000;
export const PAID_AT_STAGE = [0, 0, 31000, 62000] as const;

export function formatKr(value: number, locale: LandingLocale) {
  const n = new Intl.NumberFormat(locale === "nb" ? "nb-NO" : "en-GB", {
    maximumFractionDigits: 0,
  }).format(value);
  return `${n} kr`;
}

const nb = {
  hero: {
    left: "Fra forespørsel",
    right: "til betalt.",
    sub: "Event Manager samler bookinger, kunder og fakturaer for lokalet ditt.",
    cta: "Start gratis prøveperiode",
    trial: "30 dager gratis. Kort registreres ved oppstart.",
  },
  booking: {
    title: "Bryllup",
    customer: "Andersen",
    date: "14. juni",
    room: "Storsalen",
    total: "Totalt",
    paid: "Betalt",
    outstanding: "Utestående",
    stages: ["Forespørsel", "Bekreftet", "Delvis betalt", "Betalt"],
    next: "Neste steg",
    restart: "Start på nytt",
    hint: "Trykk på et steg og se utestående beløp endre seg.",
  },
  features: {
    title: "Alt lokalet trenger, ett tastetrykk unna.",
    placeholder: "Finn en funksjon",
    empty: "Ingen treff",
    items: [
      { name: "Forespørsler", key: "E", text: "Svar raskt og gjør forespørselen om til en booking." },
      { name: "Bookinger", key: "B", text: "Dato, lokale, kunde og status samlet i én liste." },
      { name: "Kunder", key: "K", text: "Historikk og kontaktinfo per kunde, uten regneark." },
      { name: "Fakturaer", key: "F", text: "Se betalt, delvis betalt og forfalt med én gang." },
      { name: "Priser", key: "P", text: "Faste pakker og tjenester gir like tilbud hver gang." },
      { name: "Overnatting", key: "O", text: "Rom og reservasjoner holdt adskilt fra salene." },
      { name: "Inventar", key: "I", text: "Utstyr knyttet til lokaler og arrangementer." },
      { name: "Rapporter", key: "R", text: "Omsetning per måned og utestående beløp." },
    ],
  },
  how: {
    title: "Slik fungerer det",
    sliderLabel: "Steg i booking",
    clauses: [
      "Først tar du imot forespørselen.",
      "Så bekrefter du bookingen.",
      "Deretter følger du opp betalingen.",
      "Til slutt er alt betalt.",
    ],
  },
  showcase: {
    title: "Bygget for daglig drift.",
    panels: [
      { name: "Bookinger", text: "Alle arrangementer med dato, lokale og status. Filtrer på det som trenger oppfølging." },
      { name: "Fakturaer", text: "Delbetalinger og forfall ligger på samme sted som bookingen." },
      { name: "Kunder", text: "Hver kunde med historikk, kontaktinfo og kommende arrangementer." },
      { name: "Priser og pakker", text: "Standardiser tilbudene dine, så du ikke regner på nytt hver gang." },
      { name: "Rapporter", text: "Fakturert beløp per måned, med høyeste måned markert." },
    ],
  },
  pricing: {
    title: "Én pris. Hele verktøyet.",
    text: "Én plan med alt du trenger. Ingen skjulte nivåer eller tillegg.",
    period: "per måned",
    included: [
      "Bookinger, forespørsler og overnatting",
      "Kunder, fakturaer og betalinger",
      "Priser, pakker og inventar",
      "Rapporter og flere lokaler",
    ],
    cta: "Start gratis prøveperiode",
    trial: "30 dager gratis. Kort registreres ved oppstart, første trekk kommer etter prøven.",
  },
  faq: {
    title: "Ofte stilte spørsmål",
  },
  cta: {
    line1: "Din første",
    line2: "booking.",
    text: "Du får 30 dager gratis. Kort registreres ved oppstart, og første trekk kommer etter prøveperioden.",
    dialogTitle: "Gi lokalet et navn",
    nameLabel: "Navn på lokalet",
    nameDefault: "Rønningen Selskapslokale",
    kindLabel: "Hvor mange lokaler?",
    kinds: ["Ett lokale", "Flere lokaler"],
    button: "Start gratis prøveperiode",
  },
  footer: {
    what: "Booking for lokaler",
    year: "Event Manager",
    by: "Xala Technologies AS",
  },
  fragments: {
    bookings: "Bookinger",
    invoices: "Fakturaer",
    customers: "Kunder",
    packages: "Priser og pakker",
    reports: "Rapporter",
    status: { confirmed: "Bekreftet", partial: "Delvis betalt", inquiry: "Forespørsel", paid: "Betalt", overdue: "Forfalt" },
    invoiceNo: "Faktura",
    due: "Forfaller",
    bookingsCount: "bookinger",
    lastEvent: "Siste arrangement",
    perEvent: "per arrangement",
    included: "Inkludert",
    monthly: "Fakturert per måned",
    peak: "Høyeste",
    months: ["Jan", "Feb", "Mar", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Des"],
  },
};

const en: typeof nb = {
  hero: {
    left: "From inquiry",
    right: "to paid.",
    sub: "Event Manager keeps bookings, customers and invoices together for your venue.",
    cta: "Start free trial",
    trial: "30 days free. Card registered at sign-up.",
  },
  booking: {
    title: "Wedding",
    customer: "Andersen",
    date: "14 June",
    room: "Main hall",
    total: "Total",
    paid: "Paid",
    outstanding: "Outstanding",
    stages: ["Inquiry", "Confirmed", "Part paid", "Paid"],
    next: "Next step",
    restart: "Start over",
    hint: "Tap a step and watch the outstanding amount change.",
  },
  features: {
    title: "Everything your venue needs, one keystroke away.",
    placeholder: "Find a feature",
    empty: "No match",
    items: [
      { name: "Inquiries", key: "E", text: "Reply fast and turn an inquiry into a booking." },
      { name: "Bookings", key: "B", text: "Date, room, customer and status in one list." },
      { name: "Customers", key: "K", text: "History and contact details per customer, no spreadsheets." },
      { name: "Invoices", key: "F", text: "See paid, part paid and overdue at a glance." },
      { name: "Pricing", key: "P", text: "Fixed packages and services keep every quote the same." },
      { name: "Accommodation", key: "O", text: "Rooms and reservations kept apart from the halls." },
      { name: "Inventory", key: "I", text: "Equipment tied to venues and events." },
      { name: "Reports", key: "R", text: "Revenue per month and outstanding amounts." },
    ],
  },
  how: {
    title: "How it works",
    sliderLabel: "Booking step",
    clauses: [
      "First you receive the inquiry.",
      "Then you confirm the booking.",
      "Next you follow up the payment.",
      "In the end, it is all paid.",
    ],
  },
  showcase: {
    title: "Built for daily operations.",
    panels: [
      { name: "Bookings", text: "Every event with date, room and status. Filter for what needs follow-up." },
      { name: "Invoices", text: "Part payments and due dates sit next to the booking." },
      { name: "Customers", text: "Each customer with history, contact details and upcoming events." },
      { name: "Pricing and packages", text: "Standardise your offers so you never recalculate." },
      { name: "Reports", text: "Invoiced amount per month, with the peak month marked." },
    ],
  },
  pricing: {
    title: "One price. The whole tool.",
    text: "One plan with everything you need. No hidden tiers or add-ons.",
    period: "per month",
    included: [
      "Bookings, inquiries and accommodation",
      "Customers, invoices and payments",
      "Pricing, packages and inventory",
      "Reports and multiple venues",
    ],
    cta: "Start free trial",
    trial: "30 days free. Card registered at sign-up, first charge comes after the trial.",
  },
  faq: {
    title: "Frequently asked questions",
  },
  cta: {
    line1: "Your first",
    line2: "booking.",
    text: "You get 30 days free. Card registered at sign-up, and the first charge comes after the trial.",
    dialogTitle: "Name your venue",
    nameLabel: "Venue name",
    nameDefault: "Rønningen Selskapslokale",
    kindLabel: "How many venues?",
    kinds: ["One venue", "Several venues"],
    button: "Start free trial",
  },
  footer: {
    what: "Booking for venues",
    year: "Event Manager",
    by: "Xala Technologies AS",
  },
  fragments: {
    bookings: "Bookings",
    invoices: "Invoices",
    customers: "Customers",
    packages: "Pricing and packages",
    reports: "Reports",
    status: { confirmed: "Confirmed", partial: "Part paid", inquiry: "Inquiry", paid: "Paid", overdue: "Overdue" },
    invoiceNo: "Invoice",
    due: "Due",
    bookingsCount: "bookings",
    lastEvent: "Last event",
    perEvent: "per event",
    included: "Included",
    monthly: "Invoiced per month",
    peak: "Peak",
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  },
};

export const COPY = { nb, en } as const;
export type LandingCopy = typeof nb;

export function copyFor(locale: string): LandingCopy {
  return locale === "en" ? COPY.en : COPY.nb;
}

export function langOf(locale: string): LandingLocale {
  return locale === "en" ? "en" : "nb";
}
