import { parsePackageDescription } from "@/lib/pricing/parse-package-description";
import type { FrozenContractDocument } from "@/lib/contracts/types";

export const PLUS_PACKAGE_FEATURES = [
  "Hele lokalet, bord og stoler",
  "Bar og uteområdet",
  "Fullt utstyrt kjøkken for matlaging og servering",
  "Opprigg og nedrigg",
  "Scene (dekoreres selv)",
  "Sluttvask og sluttrengjøring",
  "Oppdekking, bordduk og stoltrekk",
  "Lyd og lys",
  "Sikkerhetspersonell som bistår under arrangementet",
  "Teknisk utstyr (høyttalere/mikrofon til taler og bakgrunnsmusikk)",
  "Toalettpapir, håndsåpe og tørkepapir",
  "Hygiene-artikler, lysestaker og vaser",
  "Praktisk oppfølging under arrangementet",
] as const;

export const PLUS_PACKAGE_FOOTER =
  "Leietaker står fritt til å ha med egen mat og drikke";

export const PLUS_PACKAGE_DESCRIPTION = [
  ...PLUS_PACKAGE_FEATURES.map((line) => `- ${line}`),
  PLUS_PACKAGE_FOOTER,
].join("\n");

export const DEFAULT_CONTRACT_LEGAL_TERMS = `4. Betingelser
• Reservasjon er gyldig etter første innbetaling er mottatt.
• Leietaker må være over 23 år og ha bosted i Norge. Leietaker må selv være til stede under arrangementet.
• Leietaker er ansvarlig dersom det oppstår skader på hus og/eller inventar. Ved skade eller ødeleggelse er leietaker erstatningspliktig, og vil bli fakturert etter befaring og enighet. Leietaker forplikter seg til å gi beskjed umiddelbart hvis noe blir ødelagt.
• Uteområdet kan brukes fritt (f.eks. til vielse), men leietaker er selv ansvarlig for gjennomføringen.
• Tidspunkt for nøkkellevering skal avtales i forkant av arrangementet.
• Utleier forbeholder seg retten til å avbryte kontrakten hvis noe uforutsett oppstår med lokalet. Skulle dette skje, vil leiesummen i sin helhet bli refundert leietaker.
• Ved force majeure-situasjoner som gjør arrangementet umulig å gjennomføre, vil innbetalt leiesum refunderes i sin helhet. Dersom mulig vil vi forsøke å finne alternativ dato.
• Avtalen er bindende ved kontraktsinngåelse. Rønningen har ingen refusjonsplikt hvis leietaker ønsker å kansellere arrangementet.

6. Informasjonsskriv og husregler
Følgende regler gjelder for arrangementet og skal formidles til alle gjester:

Adkomst og parkering
• Fartsgrensen på innkjøringsveien er 30 km/t. Baneveien er en turvei på en gammel jernbanestrekning for folk til fots, sykkel og ridende på hest. Dette skal formidles til alle gjester.

Tider og støy
• Alle vinduer og dører må være lukket senest kl. 01:00, slik at musikk ikke er til sjenanse for naboer.
• Lokalet må være forlatt senest kl. 02:30.
• Høyttalere i taket kan brukes, men er kun dimensjonert til lav bakgrunnsmusikk og taler.

Røyking og fyrverkeri
• All røyking MÅ foregå der det er «sneipebøtter». Da dyr lett kan bli nikotinforgiftet, må alle sneiper opp i bøttene.
• Det er ikke lov å røyke på siden av lokalet mot våningshus og låve.
• Sjekk og rydd uteområdet og parkeringsplassen for sneiper før overlevering av lokalet.
• Fyrverkeri er FORBUDT.

Avfall
• Kildesorter og kast riktig avfall i riktig dunk.
• Ta med hjem rester og alt tomgods (flasker, metall/glass) – lever til gjenvinning selv.

Uteområde
• Husk å lukke igjen grinder!
• Sneiper og søppel på uteområdet plukkes opp av leietaker før tilbakelevering – husk begge sidene av bygget.

Wifi og telefon
• Telefondekning på gården er litt ustabil. Bruk WIFI tale ved behov.
• Nettverksnavn: Rønningen Selskapslokale  Passord: Fest2019

Fotografering
• Ta gjerne kontakt om dere trenger tips til fotolokasjoner – vi kjenner flere flotte plasser i umiddelbar nærhet!

7. Generelt om avfall og overleveringen
Sluttvask og rengjøring er inkludert i pakken og utføres av oss. Leietaker har likevel ansvar for:
• Kildesorter og kast riktig avfall i riktig dunk.
• Kjølerom/-skap og fryser tømmes – medbrakt innhold tas med hjem.
• Alt tomgods (flasker, metall/glass) tas med hjem og leveres til gjenvinning.
• Er det knust servise, glass eller annet inventar, gi beskjed umiddelbart – dette kan bli fakturert.
• Alle brukte lysestaker rengjøres for stearinrester. Vaser rengjøres.

Siste sjekk
• Vinduer og dører lukkes og låses.
• Lys og elektrisk utstyr slås av.
• Dobbeltsjekk at dere har fått med dere alt hjem.
• Nøkkel leveres etter avtale. Ved nøkkellevering gjennomgår vi lokalet sammen.`;

export function chosenPackageLabel(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  if (/pakke/i.test(trimmed)) return trimmed;
  return `${trimmed} pakken`;
}

export function frozenPackageDescription(
  name: string,
  description: string | null | undefined,
): string | null {
  const text = description?.trim() || null;
  if (text) return text;
  if (/plus/i.test(name)) return PLUS_PACKAGE_DESCRIPTION;
  return null;
}

export function resolvePackageInclusions(
  description: string | null | undefined,
  packageName?: string | null,
): { tagline: string | null; features: string[]; footer: string | null } {
  const parsed = parsePackageDescription(description);
  const features = [...parsed.features];
  let footer: string | null = null;
  const footerIndex = features.findIndex((line) => /egen mat og drikke/i.test(line));
  if (footerIndex >= 0) {
    footer = features.splice(footerIndex, 1)[0] ?? null;
  }
  const isPlus = Boolean(packageName && /plus/i.test(packageName));
  if (!parsed.tagline && features.length === 0 && isPlus) {
    return {
      tagline: null,
      features: [...PLUS_PACKAGE_FEATURES],
      footer: PLUS_PACKAGE_FOOTER,
    };
  }
  return {
    tagline: parsed.tagline,
    features,
    footer,
  };
}

export function resolvedLegalTerms(legalTerms: string | null | undefined): string {
  const text = legalTerms?.trim() ?? "";
  if (text.includes("Informasjonsskriv og husregler") && text.includes("4. Betingelser")) {
    return legalTerms!.trim();
  }
  return DEFAULT_CONTRACT_LEGAL_TERMS;
}

export function issuerWebsite(doc: FrozenContractDocument): string | null {
  const tag = doc.issuer.tagline?.trim() ?? "";
  if (/www\.|https?:\/\//i.test(tag)) {
    return tag.replace(/^https?:\/\//i, "");
  }
  const email = doc.issuer.email?.trim() ?? "";
  const at = email.lastIndexOf("@");
  if (at > 0) return `www.${email.slice(at + 1)}`;
  return null;
}

export function letterheadBrandLine(doc: FrozenContractDocument): string {
  const site = issuerWebsite(doc);
  const name = contractHeadingIssuerName(doc);
  return site ? `${name} ${site}` : name;
}

export function contractHeadingIssuerName(doc: FrozenContractDocument): string {
  return doc.issuer.legalName.trim();
}
