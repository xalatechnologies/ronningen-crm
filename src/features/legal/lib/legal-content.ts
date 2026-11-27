import type { Locale } from "@/i18n/config";
import { CONTACT_EMAIL } from "@/config/app";
import { LEGAL_COMPANY, type LegalDocumentKey } from "@/features/legal/lib/legal-documents";

const COMPANY = `${LEGAL_COMPANY.name} (org.nr. ${LEGAL_COMPANY.orgNumber})`;
const COMPANY_NB = `${COMPANY}, ${LEGAL_COMPANY.city}`;
const CONTACT = `${CONTACT_EMAIL} (${LEGAL_COMPANY.website})`;

export type LegalSection = { heading: string; body: string[] };
export type LegalContent = { title: string; intro: string; sections: LegalSection[] };

/**
 * The legal texts shown on /vilkar, /personvern and /databehandleravtale and accepted at signup.
 * Norwegian and English must have the same sections and the same number of paragraphs per section.
 * When the meaning of a text changes, bump the version in legal-documents.ts so users accept it again.
 */
const nb: Record<LegalDocumentKey, LegalContent> = {
  terms: {
    title: "Brukervilkår",
    intro: "Disse vilkårene gjelder når du oppretter konto og bruker Event Manager.",
    sections: [
      {
        heading: "1. Om avtalen og tjenesten",
        body: [
          "Event Manager er en nettbasert tjeneste for lokaler og utleiere. Den samler forespørsler, bookinger, kunder, fakturaer, økonomioversikt og en kundeportal for brudepar og arrangører.",
          "Tjenesten er beregnet på næringsdrivende. Ved å opprette konto bekrefter du at du bruker tjenesten som ledd i næringsvirksomhet, og forbrukerlovgivningens regler om angrerett og lignende gjelder derfor ikke mellom oss.",
        ],
      },
      {
        heading: "2. Avtaleparter og konto",
        body: [
          `Avtalen inngås mellom ${COMPANY_NB} («leverandøren») og virksomheten som oppretter konto («du» eller «kunden»).`,
          "Du bekrefter at du har fullmakt til å binde virksomheten du registrerer, og at opplysningene du oppgir er riktige. Du må holde dem oppdatert.",
          "Du er ansvarlig for all bruk som skjer med din konto og for brukerne du gir tilgang. Hold innloggingsopplysningene hemmelige, og si fra til oss uten opphold hvis du tror at noen uvedkommende har fått tilgang.",
        ],
      },
      {
        heading: "3. Prøveperiode, pris og betaling",
        body: [
          "Du starter med 30 dagers gratis prøveperiode. Betalingskort registreres ved oppstart, og første trekk skjer når prøveperioden er over. Du kan si opp før prøveperioden utløper uten at du blir belastet.",
          "Etter prøveperioden gjelder prisene i den til enhver tid gjeldende prisoversikten. Alle priser oppgis eksklusiv merverdiavgift (25 %). Abonnementet faktureres månedlig forskuddsvis, og betalingen gjennomføres via betalingstjenesten Stripe.",
          "Vi kan endre prisene med minst 30 dagers skriftlig varsel før endringen trer i kraft. Hvis du ikke aksepterer ny pris, kan du si opp abonnementet før endringen trer i kraft.",
          "Ved forsinket betaling kan vi kreve forsinkelsesrente etter forsinkelsesrenteloven og stenge tilgangen til tjenesten etter varsel. Betalt periode refunderes ikke ved oppsigelse, med mindre ufravikelig lov krever noe annet.",
        ],
      },
      {
        heading: "4. Bruk av tjenesten",
        body: [
          "Du skal bruke tjenesten i samsvar med gjeldende lov og disse vilkårene. Du skal ikke forsøke å få tilgang til andre kunders data, omgå sikkerhetstiltak, forstyrre driften eller belaste tjenesten uforholdsmessig.",
          "Du skal ikke bruke tjenesten til å lagre eller spre ulovlig innhold, eller til å sende uønsket markedsføring i strid med markedsføringsloven.",
        ],
      },
      {
        heading: "5. Dine data og immaterielle rettigheter",
        body: [
          "Du beholder alle rettigheter til dataene du legger inn i tjenesten. Du gir oss den nødvendige retten til å lagre og behandle dem for å levere tjenesten til deg, og bare til det formålet.",
          "Leverandøren eier alle rettigheter til tjenesten, programvaren, designet og varemerkene. Du får en begrenset, ikke-eksklusiv og ikke-overdragbar rett til å bruke tjenesten så lenge avtalen varer.",
          "Når avtalen opphører, kan du eksportere dataene dine. Vi sletter dem senest 30 dager etter at kontoen er avsluttet, bortsett fra opplysninger vi er pålagt å oppbevare etter lov.",
        ],
      },
      {
        heading: "6. Personvern og databehandling",
        body: [
          "Vi behandler personopplysninger om deg som bruker som behandlingsansvarlig, som beskrevet i personvernerklæringen. Opplysninger om dine egne kunder og gjester behandler vi som databehandler for deg, på vilkårene i databehandleravtalen, som er en del av denne avtalen.",
        ],
      },
      {
        heading: "7. Tilgjengelighet, support og endringer i tjenesten",
        body: [
          "Vi tilstreber høy tilgjengelighet, men kan ikke garantere at tjenesten alltid er uten avbrudd eller feil. Planlagt vedlikehold varsles når det er mulig. Support gis på e-post på norske virkedager.",
          "Vi utvikler tjenesten løpende og kan endre, forbedre eller fjerne funksjoner. Vi gjør ikke endringer som i vesentlig grad forringer tjenesten uten rimelig varsel.",
        ],
      },
      {
        heading: "8. Mislighold og ansvar",
        body: [
          "Hvis én av partene vesentlig misligholder avtalen, kan den andre kreve at forholdet rettes innen rimelig frist. Leverandøren kan i tillegg stenge en konto umiddelbart hvis bruken truer sikkerheten, er ulovlig eller betalingen uteblir, så langt det er mulig etter forutgående varsel.",
          "Leverandørens samlede erstatningsansvar er begrenset til beløpet du har betalt for tjenesten de siste 12 månedene før hendelsen. Leverandøren er ikke ansvarlig for indirekte tap, som tapt fortjeneste, tapte bookinger eller tap av goodwill.",
          "Ansvarsbegrensningen gjelder ikke ved forsett eller grov uaktsomhet, eller der loven ikke tillater begrensning. Ingen av partene er ansvarlig for forsinkelse eller mislighold som skyldes forhold utenfor partens kontroll (force majeure).",
        ],
      },
      {
        heading: "9. Varighet og oppsigelse",
        body: [
          "Avtalen gjelder fra du oppretter konto, og løper inntil den sies opp. Du kan si opp når som helst i tjenesten eller ved å kontakte oss, og abonnementet løper ut den betalte perioden.",
          "Leverandøren kan si opp avtalen med 30 dagers skriftlig varsel. Ved vesentlig mislighold kan avtalen sies opp med umiddelbar virkning.",
          "Bestemmelser som etter sin art skal gjelde også etter opphør, blant annet om dine data, ansvar, lovvalg og verneting, består.",
        ],
      },
      {
        heading: "10. Endringer i vilkårene",
        body: [
          "Vi kan oppdatere vilkårene. Ved vesentlige endringer varsler vi deg på e-post eller i tjenesten minst 30 dager før endringen trer i kraft.",
          "Hvis du ikke ønsker å godta endringene, kan du si opp avtalen før de trer i kraft. Fortsatt bruk etter ikrafttredelsen regnes som aksept.",
        ],
      },
      {
        heading: "11. Lovvalg og verneting",
        body: [
          "Avtalen er underlagt norsk rett. Tvister skal først søkes løst i minnelighet. Kommer partene ikke til enighet, avgjøres tvisten av Asker og Bærum tingrett som verneting.",
          `Spørsmål om vilkårene kan sendes til ${CONTACT}.`,
        ],
      },
    ],
  },
  privacy: {
    title: "Personvernerklæring",
    intro: "Her forklarer vi hvilke personopplysninger vi behandler om deg som bruker av Event Manager, hvorfor og hvilke rettigheter du har.",
    sections: [
      {
        heading: "1. Hvem er behandlingsansvarlig",
        body: [
          `For opplysningene om deg som bruker, som konto, innlogging og bruk av tjenesten, er ${COMPANY_NB} behandlingsansvarlig.`,
          "For opplysninger om lokalets egne kunder og gjester er lokalet behandlingsansvarlig, og vi er databehandler på lokalets vegne. Det er regulert i databehandleravtalen. Henvender du deg som kunde eller gjest til et lokale, skal du kontakte lokalet om dine rettigheter.",
          `Du kan kontakte oss om personvern på ${CONTACT}.`,
        ],
      },
      {
        heading: "2. Hvilke opplysninger vi behandler",
        body: [
          "Opplysninger du gir oss: navn, e-postadresse, passord (lagres kryptert som hash), organisasjonen du tilhører, rollen din og språkvalg.",
          "Opplysninger som oppstår ved bruk: innloggingskoder og -tidspunkt, IP-adresse for sikkerhet og misbruksvern, logger over endringer i kontoen og hvilke avtaler du har godtatt med tidspunkt og versjon. Kortopplysninger behandles av Stripe og lagres ikke hos oss.",
        ],
      },
      {
        heading: "3. Formål og behandlingsgrunnlag",
        body: [
          "Å opprette og drifte kontoen din, gi deg tilgang og levere tjenesten (avtale, personvernforordningen art. 6 nr. 1 bokstav b).",
          "Å oppfylle regnskaps- og bokføringsplikt og annen lovpålagt dokumentasjon (rettslig forpliktelse, bokstav c).",
          "Å sikre tjenesten, forebygge misbruk og svindel og kunne dokumentere hvilke avtaler du har godtatt (berettiget interesse, bokstav f).",
          "Å sende deg nødvendige meldinger om kontoen, som innloggingskoder, kvitteringer og varsler om endringer i vilkår (avtale og berettiget interesse). Vi sender ikke markedsføring uten samtykke.",
        ],
      },
      {
        heading: "4. Hvem får opplysningene",
        body: [
          "Vi bruker underleverandører (databehandlere) til drift: Vercel (hosting av appen), Hostinger (databaseserver), Stripe (betaling) og Resend (e-postutsending). De behandler opplysningene bare på våre instrukser og etter databehandleravtale.",
          "Vi selger ikke personopplysninger og deler dem ikke med andre, med mindre vi er rettslig forpliktet til det, for eksempel overfor myndigheter.",
        ],
      },
      {
        heading: "5. Overføring ut av EØS",
        body: [
          "Enkelte underleverandører kan behandle opplysninger utenfor EØS, blant annet i USA. Slik overføring skjer bare på et gyldig overføringsgrunnlag, som EU-kommisjonens standardkontraktsbestemmelser eller EU–USA Data Privacy Framework, supplert med tiltak der det er nødvendig.",
        ],
      },
      {
        heading: "6. Lagring og sletting",
        body: [
          "Vi lagrer opplysningene så lenge kontoen er aktiv, og så lenge det er nødvendig for formålene over. Kontoopplysninger slettes senest 30 dager etter at kontoen er avsluttet.",
          "Regnskapsmateriale som faktura- og betalingsopplysninger oppbevares i 5 år etter bokføringsloven. Sikkerhetslogger slettes når de ikke lenger er nødvendige.",
        ],
      },
      {
        heading: "7. Dine rettigheter",
        body: [
          "Du har rett til innsyn i opplysningene vi har om deg, til å få dem rettet eller slettet, til å begrense behandlingen, til å protestere mot behandling som bygger på berettiget interesse og til å få utlevert opplysningene i et maskinlesbart format (dataportabilitet). Der behandlingen bygger på samtykke, kan du trekke det tilbake.",
          `Du kan utøve rettighetene ved å kontakte oss på ${CONTACT}. Vi svarer innen 30 dager. Du har også rett til å klage til Datatilsynet (datatilsynet.no) hvis du mener vi behandler opplysninger i strid med regelverket.`,
        ],
      },
      {
        heading: "8. Informasjonskapsler",
        body: [
          "Vi bruker bare nødvendige informasjonskapsler og lignende lagring i nettleseren: for å holde deg innlogget og for å huske språk- og visningsvalg. Disse krever ikke samtykke etter ekomloven.",
          "Vi bruker ikke annonsesporing og setter ikke informasjonskapsler fra tredjeparter for markedsføring.",
        ],
      },
      {
        heading: "9. Sikkerhet",
        body: [
          "Vi har tekniske og organisatoriske tiltak for å beskytte opplysningene: adskilte data per organisasjon med tilgangskontroll, kryptert overføring, hashede passord, begrenset intern tilgang og logging. Oppdager vi et brudd som kan medføre risiko for deg, varsler vi Datatilsynet og deg i samsvar med regelverket.",
        ],
      },
      {
        heading: "10. Endringer i erklæringen",
        body: [
          "Vi kan oppdatere denne erklæringen. Ved vesentlige endringer varsler vi deg i tjenesten eller på e-post. Gjeldende versjon er alltid tilgjengelig på denne siden.",
        ],
      },
    ],
  },
  dpa: {
    title: "Databehandleravtale",
    intro: "Når du legger inn opplysninger om dine kunder og gjester, er du behandlingsansvarlig og vi er databehandler. Denne avtalen regulerer det, jf. personvernforordningen (GDPR) art. 28.",
    sections: [
      {
        heading: "1. Parter og formål",
        body: [
          `Avtalen gjelder mellom virksomheten som oppretter konto («behandlingsansvarlig») og ${COMPANY_NB} («databehandler»). Den er en del av brukervilkårene og gjelder fra kontoen opprettes.`,
          "Formålet er at databehandleren skal levere Event Manager til den behandlingsansvarlige, og i den forbindelse behandle personopplysninger på den behandlingsansvarliges vegne.",
        ],
      },
      {
        heading: "2. Behandlingens art og varighet",
        body: [
          "Behandlingen omfatter lagring, organisering, visning, utsending og sletting av opplysninger som den behandlingsansvarlige eller dennes kunder legger inn i tjenesten, herunder bookinger, fakturaer og meldinger i kundeportalen.",
          "Behandlingen varer så lenge den behandlingsansvarlige har en aktiv konto, og avsluttes etter punkt 12.",
        ],
      },
      {
        heading: "3. Kategorier av opplysninger og registrerte",
        body: [
          "Kategorier av registrerte: lokalets kunder, kontaktpersoner, gjester og ansatte.",
          "Kategorier av opplysninger: navn, kontaktinformasjon, bookingdetaljer, fakturaer og betalingsstatus, gjestelister og meldinger i kundeportalen. Tjenesten er ikke beregnet for særlige kategorier av personopplysninger, og den behandlingsansvarlige skal ikke legge slike opplysninger inn uten å avtale det med databehandleren.",
        ],
      },
      {
        heading: "4. Instrukser og behandlingsansvarliges plikter",
        body: [
          "Databehandleren behandler opplysningene bare etter dokumenterte instrukser fra den behandlingsansvarlige, og bare for å levere tjenesten. Denne avtalen og bruken av tjenesten er den behandlingsansvarliges fullstendige instruks. Mener databehandleren at en instruks er i strid med regelverket, varsler vedkommende den behandlingsansvarlige.",
          "Den behandlingsansvarlige er ansvarlig for at det finnes et lovlig behandlingsgrunnlag, for å informere de registrerte, og for at opplysningene som legges inn er lovlige å behandle.",
        ],
      },
      {
        heading: "5. Taushetsplikt",
        body: [
          "Alle hos databehandleren som får tilgang til opplysningene er underlagt taushetsplikt og har kun tilgang når det er nødvendig for å levere eller støtte tjenesten.",
        ],
      },
      {
        heading: "6. Sikkerhet",
        body: [
          "Databehandleren gjennomfører egnede tekniske og organisatoriske tiltak etter GDPR art. 32: data holdes adskilt per organisasjon med tilgangskontroll i databasen, overføres kryptert, passord lagres som hash, og endringer og tilgang logges.",
          "Tiltakene gjennomgås løpende og tilpasses risikoen ved behandlingen.",
        ],
      },
      {
        heading: "7. Underbehandlere",
        body: [
          "Den behandlingsansvarlige gir databehandleren en generell tillatelse til å bruke underbehandlere. Per i dag er det Vercel (hosting), Hostinger (databaseserver), Stripe (betaling) og Resend (e-postutsending).",
          "Databehandleren inngår skriftlig avtale med hver underbehandler som pålegger dem de samme forpliktelsene som i denne avtalen, og er ansvarlig overfor den behandlingsansvarlige for deres oppfyllelse.",
          "Databehandleren varsler om planlagte endringer av underbehandlere med minst 30 dagers frist. Den behandlingsansvarlige kan protestere med saklig grunn innen fristen. Kan ikke saken løses, kan den behandlingsansvarlige si opp avtalen.",
        ],
      },
      {
        heading: "8. Overføring til tredjeland",
        body: [
          "Overføring av opplysninger til land utenfor EØS skjer bare på grunnlag av EU-kommisjonens standardkontraktsbestemmelser, EU–USA Data Privacy Framework eller et annet gyldig overføringsgrunnlag etter GDPR kapittel V.",
        ],
      },
      {
        heading: "9. Bistand til den behandlingsansvarlige",
        body: [
          "Databehandleren bistår den behandlingsansvarlige, så langt det er mulig og rimelig, med å svare på de registrertes rettigheter, med sikkerhet, avviksmelding, personvernkonsekvensvurderinger og kontakt med tilsynsmyndigheten. Rimelig tid brukt på særskilt bistand kan faktureres etter avtale.",
        ],
      },
      {
        heading: "10. Brudd på personopplysningssikkerheten",
        body: [
          "Oppdager databehandleren et brudd på personopplysningssikkerheten som gjelder den behandlingsansvarliges opplysninger, varsler vedkommende den behandlingsansvarlige uten ugrunnet opphold og senest innen 48 timer etter at bruddet ble kjent.",
          "Varselet beskriver så langt det er kjent hva som har skjedd, hvilke opplysninger som er berørt, mulige følger og tiltak som er iverksatt. Den behandlingsansvarlige er ansvarlig for eventuell melding til Datatilsynet og de registrerte.",
        ],
      },
      {
        heading: "11. Revisjon og dokumentasjon",
        body: [
          "Databehandleren gir den behandlingsansvarlige informasjonen som trengs for å vise at kravene i GDPR art. 28 er oppfylt, og tillater revisjoner, inkludert inspeksjoner, som den behandlingsansvarlige eller en uavhengig revisor gjennomfører etter rimelig forhåndsvarsel og uten å forstyrre driften unødig.",
        ],
      },
      {
        heading: "12. Varighet, sletting og retur",
        body: [
          "Ved opphør av avtalen kan den behandlingsansvarlige eksportere opplysningene. Databehandleren sletter eller returnerer deretter alle opplysningene senest 30 dager etter opphør, med mindre lov krever at de oppbevares.",
          "Databehandleren bekrefter slettingen skriftlig på forespørsel.",
        ],
      },
      {
        heading: "13. Ansvar og lovvalg",
        body: [
          "Ansvaret mellom partene følger brukervilkårene, uten at det begrenser de registrertes rettigheter etter GDPR art. 82. Avtalen er underlagt norsk rett, og tvister avgjøres av Asker og Bærum tingrett som verneting.",
        ],
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
        heading: "1. About the agreement and the service",
        body: [
          "Event Manager is an online service for venues and hosts. It brings together inquiries, bookings, customers, invoices, financial overview and a customer portal for couples and organisers.",
          "The service is intended for businesses. By creating an account you confirm that you use the service in the course of business, so consumer-law rules on withdrawal rights and similar do not apply between us.",
        ],
      },
      {
        heading: "2. Parties and account",
        body: [
          `The agreement is between ${COMPANY_NB} (the “provider”) and the business creating the account (“you” or the “customer”).`,
          "You confirm that you have authority to bind the business you register and that the information you give is correct. You must keep it up to date.",
          "You are responsible for all use of your account and for the users you give access. Keep your sign-in details secret and tell us without delay if you think an unauthorised person has gained access.",
        ],
      },
      {
        heading: "3. Trial, price and payment",
        body: [
          "You start with a 30-day free trial. A payment card is registered at the start, and the first charge happens when the trial ends. You can cancel before the trial ends without being charged.",
          "After the trial the prices in the current price overview apply. All prices are stated excluding value added tax (25 %). The subscription is billed monthly in advance, and payment is processed through the payment service Stripe.",
          "We may change the prices with at least 30 days’ written notice before the change takes effect. If you do not accept the new price, you can cancel the subscription before the change takes effect.",
          "In case of late payment we may charge default interest under the Norwegian Late Payment Interest Act and, after notice, suspend access to the service. A period already paid is not refunded on cancellation, unless mandatory law requires otherwise.",
        ],
      },
      {
        heading: "4. Using the service",
        body: [
          "You must use the service in accordance with applicable law and these terms. You must not try to access other customers’ data, bypass security measures, disrupt operations or place a disproportionate load on the service.",
          "You must not use the service to store or distribute unlawful content, or to send unsolicited marketing in breach of the Norwegian Marketing Control Act.",
        ],
      },
      {
        heading: "5. Your data and intellectual property",
        body: [
          "You keep all rights to the data you enter into the service. You give us the necessary right to store and process it to deliver the service to you, and only for that purpose.",
          "The provider owns all rights to the service, the software, the design and the trademarks. You get a limited, non-exclusive and non-transferable right to use the service for as long as the agreement lasts.",
          "When the agreement ends you can export your data. We delete it no later than 30 days after the account is closed, except information we are required by law to keep.",
        ],
      },
      {
        heading: "6. Privacy and data processing",
        body: [
          "We process personal data about you as a user as controller, as described in the privacy policy. Information about your own customers and guests we process as processor on your behalf, on the terms of the data processing agreement, which forms part of this agreement.",
        ],
      },
      {
        heading: "7. Availability, support and changes to the service",
        body: [
          "We aim for high availability but cannot guarantee that the service is always free of interruptions or errors. Planned maintenance is announced when possible. Support is given by e-mail on Norwegian working days.",
          "We develop the service continuously and may change, improve or remove features. We do not make changes that materially degrade the service without reasonable notice.",
        ],
      },
      {
        heading: "8. Breach and liability",
        body: [
          "If one party materially breaches the agreement, the other may require the breach to be remedied within a reasonable time. The provider may also suspend an account immediately if the use threatens security, is unlawful or payment is not made, as far as possible after prior notice.",
          "The provider’s total liability for damages is limited to the amount you have paid for the service in the 12 months before the event. The provider is not liable for indirect loss, such as lost profit, lost bookings or loss of goodwill.",
          "The limitation does not apply to intent or gross negligence, or where the law does not allow a limitation. Neither party is liable for delay or breach caused by circumstances beyond its control (force majeure).",
        ],
      },
      {
        heading: "9. Term and cancellation",
        body: [
          "The agreement applies from when you create an account and continues until cancelled. You can cancel at any time in the service or by contacting us, and the subscription runs until the end of the paid period.",
          "The provider may terminate the agreement with 30 days’ written notice. In case of material breach the agreement may be terminated with immediate effect.",
          "Provisions that by their nature are meant to apply after termination, including those on your data, liability, governing law and venue, remain in force.",
        ],
      },
      {
        heading: "10. Changes to the terms",
        body: [
          "We may update the terms. For material changes we will notify you by e-mail or in the service at least 30 days before the change takes effect.",
          "If you do not want to accept the changes, you can cancel the agreement before they take effect. Continued use after they take effect counts as acceptance.",
        ],
      },
      {
        heading: "11. Governing law and venue",
        body: [
          "The agreement is governed by Norwegian law. Disputes shall first be sought resolved amicably. If the parties do not agree, the dispute is decided by Asker og Bærum District Court as the venue.",
          `Questions about the terms can be sent to ${CONTACT}.`,
        ],
      },
    ],
  },
  privacy: {
    title: "Privacy policy",
    intro: "This explains which personal data we process about you as a user of Event Manager, why, and which rights you have.",
    sections: [
      {
        heading: "1. Who is the controller",
        body: [
          `For data about you as a user, such as account, sign-in and use of the service, ${COMPANY_NB} is the controller.`,
          "For data about the venue’s own customers and guests, the venue is the controller and we are the processor on the venue’s behalf. That is covered by the data processing agreement. If you contact a venue as a customer or guest, you should contact the venue about your rights.",
          `You can contact us about privacy at ${CONTACT}.`,
        ],
      },
      {
        heading: "2. What we process",
        body: [
          "Data you give us: name, e-mail address, password (stored encrypted as a hash), the organisation you belong to, your role and language choice.",
          "Data created through use: sign-in codes and times, IP address for security and abuse prevention, logs of changes to the account and which agreements you have accepted, with time and version. Card details are handled by Stripe and are not stored by us.",
        ],
      },
      {
        heading: "3. Purpose and legal basis",
        body: [
          "To create and run your account, give you access and deliver the service (contract, GDPR Art. 6(1)(b)).",
          "To meet accounting and bookkeeping obligations and other legally required records (legal obligation, point (c)).",
          "To secure the service, prevent abuse and fraud, and be able to document which agreements you accepted (legitimate interest, point (f)).",
          "To send you necessary messages about the account, such as sign-in codes, receipts and notices of changes to terms (contract and legitimate interest). We do not send marketing without consent.",
        ],
      },
      {
        heading: "4. Who receives the data",
        body: [
          "We use sub-processors for operations: Vercel (hosting the app), Hostinger (database server), Stripe (payments) and Resend (sending e-mail). They process the data only on our instructions and under a data processing agreement.",
          "We do not sell personal data and do not share it with others, unless we are legally required to, for example towards authorities.",
        ],
      },
      {
        heading: "5. Transfers outside the EEA",
        body: [
          "Some sub-processors may process data outside the EEA, including in the USA. Such transfers take place only on a valid transfer basis, such as the European Commission’s standard contractual clauses or the EU–US Data Privacy Framework, supplemented by measures where necessary.",
        ],
      },
      {
        heading: "6. Storage and deletion",
        body: [
          "We keep the data while the account is active and as long as necessary for the purposes above. Account details are deleted no later than 30 days after the account is closed.",
          "Accounting records such as invoice and payment details are kept for 5 years under the Norwegian Bookkeeping Act. Security logs are deleted when they are no longer needed.",
        ],
      },
      {
        heading: "7. Your rights",
        body: [
          "You have the right to access the data we hold about you, to have it rectified or erased, to restrict processing, to object to processing based on legitimate interest and to receive the data in a machine-readable format (data portability). Where processing is based on consent, you can withdraw it.",
          `You can exercise your rights by contacting us at ${CONTACT}. We respond within 30 days. You also have the right to complain to the Norwegian Data Protection Authority (Datatilsynet, datatilsynet.no) if you believe we process data in breach of the rules.`,
        ],
      },
      {
        heading: "8. Cookies",
        body: [
          "We only use necessary cookies and similar browser storage: to keep you signed in and to remember language and display choices. These do not require consent under the Norwegian Electronic Communications Act.",
          "We do not use advertising tracking and do not set third-party cookies for marketing.",
        ],
      },
      {
        heading: "9. Security",
        body: [
          "We have technical and organisational measures to protect the data: data separated per organisation with access control, encrypted transfer, hashed passwords, limited internal access and logging. If we discover a breach that may pose a risk to you, we notify the Data Protection Authority and you in accordance with the rules.",
        ],
      },
      {
        heading: "10. Changes to this policy",
        body: [
          "We may update this policy. For material changes we will notify you in the service or by e-mail. The current version is always available on this page.",
        ],
      },
    ],
  },
  dpa: {
    title: "Data processing agreement",
    intro: "When you enter information about your customers and guests, you are the controller and we are the processor. This agreement covers that, cf. the General Data Protection Regulation (GDPR) Art. 28.",
    sections: [
      {
        heading: "1. Parties and purpose",
        body: [
          `The agreement is between the business creating the account (the “controller”) and ${COMPANY_NB} (the “processor”). It is part of the terms of use and applies from when the account is created.`,
          "Its purpose is for the processor to deliver Event Manager to the controller and, in that connection, process personal data on the controller’s behalf.",
        ],
      },
      {
        heading: "2. Nature and duration of the processing",
        body: [
          "The processing covers storage, organisation, display, sending and deletion of information that the controller or its customers enter into the service, including bookings, invoices and messages in the customer portal.",
          "The processing lasts as long as the controller has an active account and ends under section 12.",
        ],
      },
      {
        heading: "3. Categories of data and data subjects",
        body: [
          "Categories of data subjects: the venue’s customers, contact persons, guests and staff.",
          "Categories of data: name, contact details, booking details, invoices and payment status, guest lists and messages in the customer portal. The service is not intended for special categories of personal data, and the controller must not enter such data without agreeing it with the processor.",
        ],
      },
      {
        heading: "4. Instructions and the controller’s obligations",
        body: [
          "The processor processes the data only on documented instructions from the controller, and only to deliver the service. This agreement and the use of the service are the controller’s complete instruction. If the processor considers an instruction to breach the rules, it informs the controller.",
          "The controller is responsible for having a lawful basis for processing, for informing the data subjects, and for the data entered being lawful to process.",
        ],
      },
      {
        heading: "5. Confidentiality",
        body: [
          "Everyone at the processor with access to the data is bound by confidentiality and has access only when necessary to deliver or support the service.",
        ],
      },
      {
        heading: "6. Security",
        body: [
          "The processor implements appropriate technical and organisational measures under GDPR Art. 32: data is kept separate per organisation with access control in the database, transferred encrypted, passwords are stored as hashes, and changes and access are logged.",
          "The measures are reviewed continuously and adapted to the risk of the processing.",
        ],
      },
      {
        heading: "7. Sub-processors",
        body: [
          "The controller gives the processor a general authorisation to use sub-processors. Today these are Vercel (hosting), Hostinger (database server), Stripe (payments) and Resend (sending e-mail).",
          "The processor concludes a written agreement with each sub-processor imposing the same obligations as in this agreement, and is liable to the controller for their performance.",
          "The processor notifies planned changes of sub-processors with at least 30 days’ notice. The controller may object on reasonable grounds within that time. If the matter cannot be resolved, the controller may terminate the agreement.",
        ],
      },
      {
        heading: "8. Transfers to third countries",
        body: [
          "Transfers of data to countries outside the EEA take place only on the basis of the European Commission’s standard contractual clauses, the EU–US Data Privacy Framework or another valid transfer basis under GDPR Chapter V.",
        ],
      },
      {
        heading: "9. Assistance to the controller",
        body: [
          "The processor assists the controller, as far as possible and reasonable, in responding to data subjects’ rights, and with security, breach notification, data protection impact assessments and contact with the supervisory authority. Reasonable time spent on special assistance may be invoiced by agreement.",
        ],
      },
      {
        heading: "10. Personal data breaches",
        body: [
          "If the processor discovers a personal data breach affecting the controller’s data, it notifies the controller without undue delay and no later than 48 hours after the breach became known.",
          "The notice describes, as far as known, what has happened, which data is affected, possible consequences and measures taken. The controller is responsible for any notification to the Data Protection Authority and the data subjects.",
        ],
      },
      {
        heading: "11. Audit and documentation",
        body: [
          "The processor gives the controller the information needed to show that the requirements of GDPR Art. 28 are met, and allows audits, including inspections, carried out by the controller or an independent auditor after reasonable notice and without unduly disrupting operations.",
        ],
      },
      {
        heading: "12. Term, deletion and return",
        body: [
          "When the agreement ends, the controller can export the data. The processor then deletes or returns all the data no later than 30 days after termination, unless the law requires it to be kept.",
          "The processor confirms the deletion in writing on request.",
        ],
      },
      {
        heading: "13. Liability and governing law",
        body: [
          "Liability between the parties follows the terms of use, without limiting data subjects’ rights under GDPR Art. 82. The agreement is governed by Norwegian law, and disputes are decided by Asker og Bærum District Court as the venue.",
        ],
      },
    ],
  },
};

export function legalContent(key: LegalDocumentKey, locale: Locale): LegalContent {
  return (locale === "en" ? en : nb)[key];
}
