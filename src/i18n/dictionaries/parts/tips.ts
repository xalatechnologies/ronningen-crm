/** Welcome tour. Each step has a title (t) and a body (b) under its key. */
export const tipsNb = {
  stepOf: "Steg {current} av {total}",
  previous: "Forrige",
  next: "Neste",
  done: "Ferdig",
  close: "Lukk turen",
  helpButton: "Vis velkomstturen",
  helpTooltip: "Tips og hjelp",
  welcome: {
    t: "Velkommen!",
    b: "Her er en rask tur gjennom det viktigste, så kommer du raskt i gang. Det tar under to minutter, og du kan lukke den når som helst.",
  },
  company: {
    t: "Virksomhetsprofil",
    b: "Fyll ut navn, organisasjonsnummer, adresse og betalingsinfo. Det brukes på fakturaer og vises til kundene dine.",
  },
  venue: {
    t: "Legg til lokalet ditt",
    b: "Registrer lokalene kundene kan booke. Uten et lokale kan du ikke ta imot forespørsler eller bookinger.",
  },
  bookings: {
    t: "Reservasjoner",
    b: "Her ser du alle bookinger og kan følge opp dato, kunde og betaling. Forespørsler fra kunder havner i Forespørsler.",
  },
  pricing: {
    t: "Priser og pakker",
    b: "Lag pakker og tjenester med pris. De brukes når du lager tilbud og bookinger.",
  },
  customers: {
    t: "Kunder",
    b: "Alle som har kontaktet deg eller booket samles her, med historikk og kontaktinfo.",
  },
  contracts: {
    t: "Leieavtaler",
    b: "Sett opp malen for leieavtalen, så kan du sende den digitalt til kunden for signering.",
  },
  invoices: {
    t: "Fakturaer og betaling",
    b: "Følg med på hva som er fakturert, betalt og utestående, og send påminnelser når det trengs.",
  },
  team: {
    t: "Team og tilgang",
    b: "Inviter kollegaer og gi dem riktig rolle, så ser hver person bare det de skal bruke.",
  },
  account: {
    t: "Din konto og sikkerhet",
    b: "Her bytter du passord og ser hvordan du logger inn. Du kan også logge inn med en engangskode på e-post.",
  },
  help: {
    t: "Du finner turen igjen her",
    b: "Trykk på spørsmålstegnet øverst når som helst for å se turen på nytt.",
  },
} as const;

export const tipsEn = {
  stepOf: "Step {current} of {total}",
  previous: "Previous",
  next: "Next",
  done: "Done",
  close: "Close the tour",
  helpButton: "Show the welcome tour",
  helpTooltip: "Tips and help",
  welcome: {
    t: "Welcome!",
    b: "Here is a quick tour of the essentials so you can get going fast. It takes under two minutes, and you can close it at any time.",
  },
  company: {
    t: "Business profile",
    b: "Fill in your name, organization number, address and payment details. They are used on invoices and shown to your customers.",
  },
  venue: {
    t: "Add your venue",
    b: "Register the venues customers can book. Without a venue you cannot take inquiries or bookings.",
  },
  bookings: {
    t: "Bookings",
    b: "See every booking here and follow up on date, customer and payment. Customer requests arrive under Inquiries.",
  },
  pricing: {
    t: "Prices and packages",
    b: "Create packages and services with a price. They are used when you make quotes and bookings.",
  },
  customers: {
    t: "Customers",
    b: "Everyone who has contacted you or booked is collected here, with history and contact details.",
  },
  contracts: {
    t: "Rental agreements",
    b: "Set up your rental agreement template, then send it digitally to the customer to sign.",
  },
  invoices: {
    t: "Invoices and payments",
    b: "Keep track of what is invoiced, paid and outstanding, and send reminders when needed.",
  },
  team: {
    t: "Team and access",
    b: "Invite colleagues and give them the right role, so each person only sees what they need.",
  },
  account: {
    t: "Your account and security",
    b: "Change your password and see how you sign in here. You can also sign in with a one-time code by e-mail.",
  },
  help: {
    t: "Find the tour again here",
    b: "Press the question mark at the top at any time to see the tour again.",
  },
} as const;
