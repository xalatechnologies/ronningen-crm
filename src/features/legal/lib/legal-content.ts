import type { Locale } from "@/i18n/config";
import type { LegalDocumentKey } from "@/features/legal/lib/legal-documents";

export type LegalSection = { heading: string; body: string[] };
export type LegalContent = { title: string; intro: string; sections: LegalSection[] };

/**
 * DRAFT TEXT. Written as a starting point, not legal advice: it must be reviewed by the company (and a lawyer)
 * before launch. Details only the company knows are marked with [square brackets].
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
          "Avtalen inngås mellom [selskapsnavn og organisasjonsnummer] («leverandøren») og virksomheten eller personen som oppretter konto («du»).",
          "Du bekrefter at du har fullmakt til å binde virksomheten du registrerer. Hold passordet hemmelig, og si fra til oss hvis du tror noen andre har fått tilgang.",
        ],
      },
      {
        heading: "3. Bruk av tjenesten",
        body: ["Du skal bruke tjenesten lovlig. Du skal ikke forsøke å få tilgang til andre kunders data, omgå sikkerhetstiltak eller belaste tjenesten unødig."],
      },
      {
        heading: "4. Pris og betaling",
        body: ["Du kan starte med en gratis prøveperiode. Deretter gjelder prisene i den til enhver tid gjeldende prisoversikten. Betaling skjer via Stripe. [Faktureringsperiode, mva og refusjon fylles inn.]"],
      },
      {
        heading: "5. Dine data",
        body: [
          "Du eier dataene du legger inn. Vi bruker dem bare for å levere tjenesten til deg. Behandling av personopplysninger om dine egne kunder og gjester er regulert i databehandleravtalen.",
          "Når du sier opp, kan du hente ut dataene dine. [Frist for sletting etter oppsigelse fylles inn.]",
        ],
      },
      {
        heading: "6. Tilgjengelighet og ansvar",
        body: ["Vi tilstreber høy tilgjengelighet, men kan ikke garantere at tjenesten alltid er uten avbrudd. [Ansvarsbegrensning formuleres av jurist.]"],
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
        body: ["Avtalen følger norsk rett. [Verneting fylles inn.] Spørsmål kan sendes til info@xala.no."],
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
          "For opplysningene om deg som bruker (konto og innlogging) er [selskapsnavn og organisasjonsnummer] behandlingsansvarlig.",
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
        body: ["Vi bruker underleverandører for drift: Vercel (hosting av appen), [leverandør av databaseserver], Stripe (betaling) og Resend (e-post). Vi selger ikke personopplysninger."],
      },
      {
        heading: "5. Lagring og sletting",
        body: ["Vi lagrer opplysningene så lenge kontoen er aktiv, og så lenge loven krever (for eksempel regnskapsloven). [Konkrete frister fylles inn.]"],
      },
      {
        heading: "6. Dine rettigheter",
        body: ["Du har rett til innsyn, retting, sletting, begrensning, dataportabilitet og til å protestere. Du kan klage til Datatilsynet. Kontakt oss på info@xala.no."],
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
        body: ["Avtalen gjelder mellom virksomheten som oppretter konto («behandlingsansvarlig») og [selskapsnavn og organisasjonsnummer] («databehandler»). Formålet er å levere Event Manager."],
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
        body: ["Data holdes adskilt per organisasjon med tilgangskontroll i databasen, overføres kryptert og endringer logges. Tiltakene gjennomgås løpende. [Utfyllende beskrivelse legges ved.]"],
      },
      {
        heading: "6. Underbehandlere",
        body: ["Databehandleren bruker Vercel, [leverandør av databaseserver], Stripe og Resend. Du varsles om endringer og kan protestere. [Land og overføringsgrunnlag utenfor EØS fylles inn.]"],
      },
      {
        heading: "7. Bistand og avvik",
        body: ["Vi hjelper deg å svare på de registrertes rettigheter, og varsler deg uten ugrunnet opphold hvis vi oppdager et brudd på personopplysningssikkerheten."],
      },
      {
        heading: "8. Varighet og sletting",
        body: ["Avtalen gjelder så lenge du bruker tjenesten. Ved opphør sletter eller returnerer vi opplysningene. [Frist fylles inn.] Du kan be om dokumentasjon på at kravene overholdes."],
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
          "The agreement is between [company name and registration number] (the “provider”) and the business or person creating the account (“you”).",
          "You confirm that you have authority to bind the business you register. Keep your password secret and tell us if you think someone else has gained access.",
        ],
      },
      {
        heading: "3. Using the service",
        body: ["You must use the service lawfully. You must not try to access other customers’ data, bypass security measures or place unreasonable load on the service."],
      },
      {
        heading: "4. Price and payment",
        body: ["You can start with a free trial. After that the prices in the current price overview apply. Payment is handled by Stripe. [Billing period, VAT and refunds to be filled in.]"],
      },
      {
        heading: "5. Your data",
        body: [
          "You own the data you enter. We use it only to deliver the service to you. Processing of personal data about your own customers and guests is covered by the data processing agreement.",
          "When you cancel you can export your data. [Deletion deadline after cancellation to be filled in.]",
        ],
      },
      {
        heading: "6. Availability and liability",
        body: ["We aim for high availability but cannot guarantee the service is always uninterrupted. [Limitation of liability to be drafted by a lawyer.]"],
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
        body: ["The agreement is governed by Norwegian law. [Venue to be filled in.] Questions can be sent to info@xala.no."],
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
          "For data about you as a user (account and sign-in), [company name and registration number] is the controller.",
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
        body: ["We use sub-processors for operations: Vercel (hosting the app), [database server provider], Stripe (payments) and Resend (e-mail). We do not sell personal data."],
      },
      {
        heading: "5. Storage and deletion",
        body: ["We keep the data while the account is active and as long as the law requires (for example accounting law). [Specific periods to be filled in.]"],
      },
      {
        heading: "6. Your rights",
        body: ["You have the right to access, rectification, erasure, restriction, data portability and to object. You can complain to the Norwegian Data Protection Authority (Datatilsynet). Contact us at info@xala.no."],
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
        body: ["The agreement is between the business creating the account (the “controller”) and [company name and registration number] (the “processor”). Its purpose is to deliver Event Manager."],
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
        body: ["Data is kept separate per organisation with database access control, transferred encrypted and changes are logged. The measures are reviewed continuously. [A fuller description will be attached.]"],
      },
      {
        heading: "6. Sub-processors",
        body: ["The processor uses Vercel, [database server provider], Stripe and Resend. You will be told about changes and can object. [Countries and transfer basis outside the EEA to be filled in.]"],
      },
      {
        heading: "7. Assistance and incidents",
        body: ["We help you respond to data subjects’ rights, and notify you without undue delay if we discover a personal data breach."],
      },
      {
        heading: "8. Duration and deletion",
        body: ["The agreement lasts as long as you use the service. On termination we delete or return the data. [Deadline to be filled in.] You can ask for documentation that the requirements are met."],
      },
    ],
  },
};

export function legalContent(key: LegalDocumentKey, locale: Locale): LegalContent {
  return (locale === "en" ? en : nb)[key];
}
