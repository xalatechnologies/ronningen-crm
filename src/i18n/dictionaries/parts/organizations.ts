export const organizationsNb = {
  nameLabel: "Organisasjonsnavn",
  namePlaceholder: "F.eks. Mitt selskap AS",
  mustBeLoggedIn: "Du må være innlogget for å opprette en organisasjon.",
  nameRequired: "Skriv inn et navn for organisasjonen.",
  created: "Organisasjon opprettet.",
  createFailed: "Kunne ikke opprette organisasjon.",
  creating: "Oppretter…",
  create: "Opprett organisasjon",
  trialHint:
    "Du får {days} dagers gratis prøveperiode uten betalingskort. Etter prøveperioden må du legge til betaling ({price} kr/mnd) under Innstillinger → Fakturering for å fortsette.",
  loadingBilling: "Laster fakturering",
  noOrganization: "Ingen organisasjon",
  selectOrganization: "Velg organisasjon",
  defaultName: "Organisasjon",
  noActiveOrg: "Ingen aktiv organisasjon.",
  noActiveOrgSelect: "Ingen aktiv organisasjon. Velg eller opprett en organisasjon.",
  defaultTagline: "Selskapslokale og arrangement",
  profileAddressHint:
    "Oppdater virksomhetsadresse og betalingsinformasjon under Innstillinger → Organisasjon.",
  profileBankDefault: "Kontonummer og KID avtales direkte ved fakturering.",
} as const;

export const organizationsEn = {
  nameLabel: "Organization name",
  namePlaceholder: "E.g. My Company Ltd",
  mustBeLoggedIn: "You must be signed in to create an organization.",
  nameRequired: "Enter a name for the organization.",
  created: "Organization created.",
  createFailed: "Could not create organization.",
  creating: "Creating…",
  create: "Create organization",
  trialHint:
    "You get a {days}-day free trial without a payment card. After the trial you must add payment ({price} NOK/month) under Settings → Billing to continue.",
  loadingBilling: "Loading billing",
  noOrganization: "No organization",
  selectOrganization: "Select organization",
  defaultName: "Organization",
  noActiveOrg: "No active organization.",
  noActiveOrgSelect: "No active organization. Select or create an organization.",
  defaultTagline: "Venue and events",
  profileAddressHint:
    "Update business address and payment information under Settings → Organization.",
  profileBankDefault: "Account number and KID are agreed directly when invoicing.",
} as const;
