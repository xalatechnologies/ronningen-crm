import type { Locale } from "@/i18n/config";
import { CONTACT_EMAIL } from "@/config/app";
import { LEGAL_COMPANY, type LegalDocumentKey } from "@/features/legal/lib/legal-documents";

const COMPANY = `${LEGAL_COMPANY.name} (org.nr. ${LEGAL_COMPANY.orgNumber})`;
const COMPANY_NB = `${COMPANY}, ${LEGAL_COMPANY.city}`;
const CONTACT = `${CONTACT_EMAIL} (${LEGAL_COMPANY.website})`;

export type LegalSection = { heading: string; body: string[] };
export type LegalContent = { title: string; intro: string; sections: LegalSection[] };

/**
 * DRAFT TEXT. Written as a starting point, not legal advice: it must be reviewed by the company (and a lawyer)
 * before launch.
 */
const nb: Record<LegalDocumentKey, LegalContent> = {
  terms: {
    title: "Brukervilkår",
    intro: "Disse vilkårene gjelder når du oppretter konto og bruker Event Manager.",
    sections: [
      {
        heading: "1. Om tjenesten",
        body: ["Event Manager er en nettbasert tjeneste for lokaler og utleiere. Den samler forespørsler, bookinger, kunder, fakturaer og en kundeportal for brudepar og arrangører."],
      },
      {
        heading: "2. Avtaleparter og konto",
        body: [
          `Avtalen inngås mellom ${COMPANY_NB} («leverandøren») og virksomheten eller personen som oppretter konto («du»).`,
          "Du bekrefter at du har fullmakt til å binde virksomheten du registrerer. Hold passordet hemmelig, og si fra til oss hvis du tror noen andre har fått tilgang.",
        ],
      },
      {
        heading: "3. Bruk av tjenesten",
        body: ["Du skal bruke tjenesten lovlig. Du skal ikke forsøke å få tilgang til andre kunders data, omgå sikkerhetstiltak eller belaste tjenesten unødig."],
      },
      {
        heading: "4. Pris og betaling",
        body: ["Du starter med 30 dagers gratis prøveperiode. Betalingskort registreres ved oppstart, og første trekk skjer etter prøveperioden. Deretter gjelder prisene i den til enhver tid gjeldende prisoversikten, oppgitt eksklusiv mva (25 %). Abonnementet faktureres månedlig forskuddsvis via Stripe. Allerede betalt periode refunderes ikke, med mindre ufravikelig lov krever noe annet."],
      },
      {
        heading: "5. Dine data",
        body: [
          "Du eier dataene du legger inn. Vi bruker dem bare for å levere tjenesten til deg. Behandling av personopplysninger om dine egne kunder og gjester er regulert i databehandleravtalen.",
          "Når du sier opp, kan du hente ut dataene dine. Vi sletter dem innen 30 dager etter at kontoen er avsluttet, bortsett fra opplysninger loven krever at vi beholder.",
        ],
      },
      {
        heading: "6. Tilgjengelighet og ansvar",
        body: ["Vi tilstreber høy tilgjengelighet, men kan ikke garantere at tjenesten alltid er uten avbrudd. Leverandørens samlede ansvar er begrenset til det du har betalt de siste 12 månedene. Begrensningen gjelder ikke ved forsett eller grov uaktsomhet, eller der loven ikke tillater den."],
      },
      {
        heading: "7. Oppsigelse",
        body: ["Du kan si opp når som helst. Vi kan stenge en konto ved vesentlig mislighold, etter forutgående varsel der det er mulig."],
      },
      {
        heading: "8. Endringer",
        body: ["Vi kan oppdatere vilkårene. Ved vesentlige endringer varsler vi deg og ber om ny godkjenning."],
      },
      {
        heading: "9. Lovvalg og kontakt",
        body: [`Avtalen følger norsk rett, og tvister avgjøres av Asker og Bærum tingrett som verneting. Spørsmål kan sendes til ${CONTACT}.`],
      },
    ],
  },
  privacy: {
    title: "Personvernerklæring",
    intro: "Her forklarer vi hvilke personopplysninger vi samler om deg som bruker, og hvorfor.",
    sections: [
      {
        heading: "1. Hvem er behandlingsansvarlig",
        body: [
          `For opplysningene om deg som bruker (konto og innlogging) er ${COMPANY_NB} behandlingsansvarlig.`,
          "For opplysninger om lokalets egne kunder og gjester er lokalet behandlingsansvarlig, og vi er databehandler. Det er regulert i databehandleravtalen.",
        ],
      },
      {
        heading: "2. Hvilke opplysninger vi behandler",
        body: ["Navn, e-postadresse og passord (lagret kryptert), organisasjonen du tilhører og din rolle, samt sikkerhetslogger over endringer i kontoen. Kortopplysninger behandles av Stripe og lagres ikke hos oss."],
      },
      {
        heading: "3. Formål og behandlingsgrunnlag",
        body: [
          "For å opprette og drifte kontoen din (avtale, GDPR art. 6 nr. 1 bokstav b).",
          "For regnskap og lovpålagt dokumentasjon (rettslig forpliktelse, bokstav c).",
          "For sikkerhet og forebygging av misbruk (berettiget interesse, bokstav f).",
        ],
      },
      {
        heading: "4. Hvem får opplysningene",
        body: ["Vi bruker underleverandører for drift: Vercel (hosting av appen), Hostinger (databaseserver), Stripe (betaling) og Resend (e-post). Vi selger ikke personopplysninger."],
      },
      {
        heading: "5. Lagring og sletting",
        body: ["Vi lagrer opplysningene så lenge kontoen er aktiv, og så lenge loven krever. Kontoopplysninger slettes innen 30 dager etter at kontoen er avsluttet. Regnskapsmateriale som faktura- og betalingsopplysninger oppbevares i 5 år etter bokføringsloven."],
      },
      {
        heading: "6. Dine rettigheter",
        body: [`Du har rett til innsyn, retting, sletting, begrensning, dataportabilitet og til å protestere. Du kan klage til Datatilsynet. Kontakt oss på ${CONTACT}.`],
      },
      {
        heading: "7. Informasjonskapsler",
        body: ["Vi bruker bare nødvendige informasjonskapsler: innlogging og språkvalg. Vi bruker ikke annonsesporing."],
      },
    ],
  },
  dpa: {
    title: "Databehandleravtale",
    intro: "Når du legger inn opplysninger om dine kunder og gjester, er du behandlingsansvarlig og vi er databehandler. Denne avtalen regulerer det (GDPR art. 28).",
    sections: [
      {
        heading: "1. Parter og formål",
        body: [`Avtalen gjelder mellom virksomheten som oppretter konto («behandlingsansvarlig») og ${COMPANY_NB} («databehandler»). Formålet er å levere Event Manager.`],
      },
      {
        heading: "2. Hva som behandles",
        body: [
          "Kategorier av registrerte: lokalets kunder, kontaktpersoner, gjester og ansatte.",
          "Kategorier av opplysninger: navn, kontaktinformasjon, bookingdetaljer, fakturaer, gjesteliste og meldinger i kundeportalen.",
        ],
      },
      {
        heading: "3. Instrukser",
        body: ["Databehandleren behandler opplysningene bare etter dokumenterte instrukser fra deg, og bare for å levere tjenesten."],
      },
      {
        heading: "4. Taushetsplikt",
        body: ["Alle hos databehandleren som får tilgang til opplysningene er underlagt taushetsplikt."],
      },
      {
        heading: "5. Sikkerhet",
        body: ["Data holdes adskilt per organisasjon med tilgangskontroll i databasen, overføres kryptert og endringer logges. Tiltakene gjennomgås løpende."],
      },
      {
        heading: "6. Underbehandlere",
        body: ["Databehandleren bruker Vercel (hosting), Hostinger (databaseserver), Stripe (betaling) og Resend (e-post). Du varsles om endringer og kan protestere. Overføring til land utenfor EØS skjer på grunnlag av EUs standardkontraktsbestemmelser eller EU–USA Data Privacy Framework."],
      },
      {
        heading: "7. Bistand og avvik",
        body: ["Vi hjelper deg å svare på de registrertes rettigheter, og varsler deg uten ugrunnet opphold hvis vi oppdager et brudd på personopplysningssikkerheten."],
      },
      {
        heading: "8. Varighet og sletting",
        body: ["Avtalen gjelder så lenge du bruker tjenesten. Ved opphør sletter eller returnerer vi opplysningene innen 30 dager. Du kan be om dokumentasjon på at kravene overholdes."],
      },
    ],
  },
};

const en: Record<LegalDocumentKey, LegalContent> = {
  terms: {
    title: "Terms of use",
    intro: "These terms apply when you create an account and use Event Manager.",
    sections: [
      {
        heading: "1. About the service",
        body: ["Event Manager is an online service for venues and hosts. It brings together inquiries, bookings, customers, invoices and a customer portal for couples and organisers."],
      },
      {
        heading: "2. Parties and account",
        body: [
          `The agreement is between ${COMPANY} (the “provider”) and the business or person creating the account (“you”).`,
          "You confirm that you have authority to bind the business you register. Keep your password secret and tell us if you think someone else has gained access.",
        ],
      },
      {
        heading: "3. Using the service",
        body: ["You must use the service lawfully. You must not try to access other customers’ data, bypass security measures or place unreasonable load on the service."],
      },
      {
        heading: "4. Price and payment",
        body: ["You start with a 30-day free trial. A payment card is registered at the start, and the first charge happens after the trial. After that the prices in the current price overview apply, stated excluding VAT (25 %). The subscription is billed monthly in advance through Stripe. A period already paid is not refunded, unless mandatory law requires otherwise."],
      },
      {
        heading: "5. Your data",
        body: [
          "You own the data you enter. We use it only to deliver the service to you. Processing of personal data about your own customers and guests is covered by the data processing agreement.",
          "When you cancel you can export your data. We delete it within 30 days after the account is closed, except information the law requires us to keep.",
        ],
      },
      {
        heading: "6. Availability and liability",
        body: ["We aim for high availability but cannot guarantee the service is always uninterrupted. The provider’s total liability is limited to what you have paid in the last 12 months. The limitation does not apply to intent or gross negligence, or where the law does not allow it."],
      },
      {
        heading: "7. Cancellation",
        body: ["You can cancel at any time. We may suspend an account for material breach, with prior notice where possible."],
      },
      {
        heading: "8. Changes",
        body: ["We may update the terms. For material changes we will notify you and ask you to accept again."],
      },
      {
        heading: "9. Governing law and contact",
        body: [`The agreement is governed by Norwegian law, and disputes are decided by Asker og Bærum District Court as the venue. Questions can be sent to ${CONTACT}.`],
      },
    ],
  },
  privacy: {
    title: "Privacy policy",
    intro: "This explains which personal data we collect about you as a user, and why.",
    sections: [
      {
        heading: "1. Who is the controller",
        body: [
          `For data about you as a user (account and sign-in), ${COMPANY} is the controller.`,
          "For data about the venue’s own customers and guests, the venue is the controller and we are the processor. That is covered by the data processing agreement.",
        ],
      },
      {
        heading: "2. What we process",
        body: ["Name, e-mail address and password (stored encrypted), the organisation you belong to and your role, and security logs of changes to the account. Card details are handled by Stripe and are not stored by us."],
      },
      {
        heading: "3. Purpose and legal basis",
        body: [
          "To create and run your account (contract, GDPR Art. 6(1)(b)).",
          "For accounting and legally required records (legal obligation, point (c)).",
          "For security and preventing abuse (legitimate interest, point (f)).",
        ],
      },
      {
        heading: "4. Who receives the data",
        body: ["We use sub-processors for operations: Vercel (hosting the app), Hostinger (database server), Stripe (payments) and Resend (e-mail). We do not sell personal data."],
      },
      {
        heading: "5. Storage and deletion",
        body: ["We keep the data while the account is active and as long as the law requires. Account details are deleted within 30 days after the account is closed. Accounting records such as invoice and payment details are kept for 5 years under the Norwegian Bookkeeping Act."],
      },
      {
        heading: "6. Your rights",
        body: [`You have the right to access, rectification, erasure, restriction, data portability and to object. You can complain to the Norwegian Data Protection Authority (Datatilsynet). Contact us at ${CONTACT}.`],
      },
      {
        heading: "7. Cookies",
        body: ["We only use necessary cookies: sign-in and language choice. We do not use advertising tracking."],
      },
    ],
  },
  dpa: {
    title: "Data processing agreement",
    intro: "When you enter information about your customers and guests, you are the controller and we are the processor. This agreement covers that (GDPR Art. 28).",
    sections: [
      {
        heading: "1. Parties and purpose",
        body: [`The agreement is between the business creating the account (the “controller”) and ${COMPANY} (the “processor”). Its purpose is to deliver Event Manager.`],
      },
      {
        heading: "2. What is processed",
        body: [
          "Categories of data subjects: the venue’s customers, contact persons, guests and staff.",
          "Categories of data: name, contact details, booking details, invoices, guest lists and messages in the customer portal.",
        ],
      },
      {
        heading: "3. Instructions",
        body: ["The processor processes the data only on your documented instructions, and only to deliver the service."],
      },
      {
        heading: "4. Confidentiality",
        body: ["Everyone at the processor with access to the data is bound by confidentiality."],
      },
      {
        heading: "5. Security",
        body: ["Data is kept separate per organisation with database access control, transferred encrypted and changes are logged. The measures are reviewed continuously."],
      },
      {
        heading: "6. Sub-processors",
        body: ["The processor uses Vercel (hosting), Hostinger (database server), Stripe (payments) and Resend (e-mail). You will be told about changes and can object. Transfers to countries outside the EEA rely on the EU standard contractual clauses or the EU–US Data Privacy Framework."],
      },
      {
        heading: "7. Assistance and incidents",
        body: ["We help you respond to data subjects’ rights, and notify you without undue delay if we discover a personal data breach."],
      },
      {
        heading: "8. Duration and deletion",
        body: ["The agreement lasts as long as you use the service. On termination we delete or return the data within 30 days. You can ask for documentation that the requirements are met."],
      },
    ],
  },
};

export function legalContent(key: LegalDocumentKey, locale: Locale): LegalContent {
  return (locale === "en" ? en : nb)[key];
}
