import { readFileSync, writeFileSync } from "node:fs";

const common = [
  ['toast.error("Kunne ikke lagre"', 'toast.error(t("common.toasts.saveFailed")'],
  ['toast.error("Kunne ikke slette"', 'toast.error(t("common.toasts.deleteFailed")'],
  ['toast.error("Kunne ikke opprette"', 'toast.error(t("common.toasts.createFailed")'],
  ['toast.error("Kunne ikke oppdatere"', 'toast.error(t("common.toasts.updateFailed")'],
  ['err instanceof Error ? err.message : "Ingen aktiv organisasjon."', 'err instanceof Error ? err.message : t("common.toasts.noActiveOrg")'],
  ['"Avbryt"', 't("common.actions.cancel")'],
  ['"Lagre"', 't("common.actions.save")'],
  ['"Slett"', 't("common.actions.delete")'],
  ['"Rediger"', 't("common.actions.edit")'],
  ['"Opprett"', 't("common.actions.create")'],
  ['"Navn"', 't("common.fields.name")'],
  ['"Notat"', 't("common.fields.notes")'],
  ['"Status"', 't("common.fields.status")'],
  ['"Søk"', 't("common.actions.search")'],
  ['"Kunde"', 't("invoices.customer")'],
  ['"E-post"', 't("common.fields.email")'],
  ['"Telefon"', 't("common.fields.phone")'],
  ['"Adresse"', 't("common.fields.address")'],
  ['"Type"', 't("common.fields.type")'],
  ['"Enhet"', 't("overnatting.tableUnit")'],
  ['"Gjester"', 't("overnatting.tableGuests")'],
  ['"Ankomst"', 't("overnatting.tableArrival")'],
  ['"Avreise"', 't("overnatting.tableDeparture")'],
  ['"Handlinger"', 't("overnatting.tableActions")'],
  ['"Alle"', 't("common.actions.all")'],
  ['"Aktiv"', 'statusLabel("active", t)'],
  ['"Inaktiv"', 'statusLabel("inactive", t)'],
  ['"Lagrer…"', 't("common.saving")'],
  ['"Sender…"', 't("settings.accountForm.sending")'],
  ['(valgfritt)', 't("overnatting.optional")'],
  ['"Valgfritt"', 't("common.actions.optional")'],
];

const fileSpecific = {
  "src/components/overnatting/new-accommodation-reservation-form.tsx": [
    ...common,
    ['import { ACCOMMODATION_RESERVATION_LABELS } from "@/components/overnatting/types";', 'import type { AccommodationReservationStatus } from "@/lib/validations";\nimport { statusLabel } from "@/lib/navigation/nav-labels";'],
    ['ACCOMMODATION_RESERVATION_LABELS[\n                            s as keyof typeof ACCOMMODATION_RESERVATION_LABELS\n                          ]', 'statusLabel(s as AccommodationReservationStatus, t)'],
    ['toast.error("Kunne ikke opprette kunde"', 'toast.error(t("overnatting.createCustomerFailed")'],
    ['ce?.message ?? "Ukjent feil"', 'ce?.message ?? t("common.toasts.genericError")'],
    ['toast.error("Kunne ikke registrere reservasjon"', 'toast.error(t("overnatting.createFailed")'],
    ['toast.success("Reservasjon registrert")', 'toast.success(t("overnatting.registered")'],
    ['Du har ikke tilgang til å opprette overnatting-reservasjoner.', 't("overnatting.noAccess")'],
    ['Tilbake til overnatting', 't("overnatting.backToOvernatting")'],
    ['aria-label="Tilbake til overnatting"', 'aria-label={t("overnatting.backToOvernatting")}'],
    ['Ny reservasjon', '{t("overnatting.newReservationTitle")}'],
    ['Kobler kunde til enhet og oppholdsperiode under «Tidspunkt» lenger ned.', '{t("overnatting.newReservationSubtitle")}'],
    ['aria-label="Lukk"', 'aria-label={t("overnatting.close")}'],
    ['activeUnits.length === 0 ? "Ingen aktive enheter" : undefined', 'activeUnits.length === 0 ? t("overnatting.noActiveUnits") : undefined'],
    ['`${u.name} (maks ${u.maxGuests} gjester)`', 't("overnatting.unitMaxGuests", { name: u.name, count: u.maxGuests })'],
    ['placeholder="— Registrer som ny kunde (fyll inn under) —"', 'placeholder={t("overnatting.newCustomerPlaceholder")}'],
    ['Kundenavn', '{t("overnatting.customerName")}'],
    ['Tidspunkt', '{t("overnatting.timeSection")}'],
    ['Velg ankomst- og avreisedato.', '{t("overnatting.timeSectionNewHint")}'],
    ['Kl. ankomst', '{t("overnatting.checkInArrival")}'],
    ['Kl. avreise', '{t("overnatting.checkOutDeparture")}'],
    ['Antall gjester', '{t("overnatting.guestCount")}'],
    ['Totalpris (valgfritt)', '{t("overnatting.totalPriceOptionalLabel")}'],
    ['Registrer reservasjon', '{t("overnatting.registerReservation")}'],
  ],
  "src/components/properties/properties-section.tsx": [
    ...common,
    ['import { propertyTypeLabel } from "@/components/properties/types";', 'import type { Translator } from "@/i18n/types";\nimport type { TranslationKey } from "@/i18n/types";'],
    ['function propertyTypeLabel(type: string | null): string {\n  if (!type?.trim()) return "—";\n  switch (type) {\n    case "selskaplokale":\n      return "Selskaplokale";\n    case "gård":\n      return "Gård";\n    case "møterom":\n      return "Møterom";\n    case "festlokale":\n      return "Festlokale";\n    case "annet":\n      return "Annet";\n    default:\n      return type;\n  }\n}', ''],
    ['function PropertyFields({\n  form,\n  idPrefix,\n}: {\n  form: UseFormReturn<PropertyFormInput>;\n  idPrefix: string;\n}) {', 'function propertyTypeLabel(type: string | null, tr: Translator): string {\n  if (!type?.trim()) return "—";\n  const key = `properties.types.${type}` as TranslationKey;\n  const value = tr(key);\n  return value === key ? type : value;\n}\n\nfunction PropertyFields({\n  form,\n  idPrefix,\n}: {\n  form: UseFormReturn<PropertyFormInput>;\n  idPrefix: string;\n}) {\n  const { t } = useTranslation();'],
    ['options={toStringOptions(PROPERTY_TYPES, propertyTypeLabel)}', 'options={toStringOptions(PROPERTY_TYPES, (type) => propertyTypeLabel(type, t))}'],
    ['function PropertyCard({', 'function PropertyCard({'],
    ['  property,\n  canManage,\n  onEdit,\n  onDelete,\n}: {\n  property: PropertyListRow;\n  canManage: boolean;\n  onEdit: () => void;\n  onDelete: () => void;\n}) {', '  property,\n  canManage,\n  onEdit,\n  onDelete,\n}: {\n  property: PropertyListRow;\n  canManage: boolean;\n  onEdit: () => void;\n  onDelete: () => void;\n}) {\n  const { t } = useTranslation();'],
    ['const typeLabel = propertyTypeLabel(property.type);', 'const typeLabel = propertyTypeLabel(property.type, t);'],
    ['aria-label={`Rediger ${property.name}`}', 'aria-label={t("properties.editAria", { name: property.name })}'],
    ['aria-label={`Slett ${property.name}`}', 'aria-label={t("properties.deleteAria", { name: property.name })}'],
    ['{address || "Ikke angitt"}', '{address || t("properties.notSpecified")}'],
    ['propertyTypeLabel(p.type)', 'propertyTypeLabel(p.type, t)'],
    ['toast.error("Kunne ikke opprette lokale"', 'toast.error(t("properties.createFailed")'],
    ['toast.success("Lokale oppdatert")', 'toast.success(t("properties.venueUpdated")'],
    ['toast.success("Lokale registrert")', 'toast.success(t("properties.venueCreated")'],
    ['toast.success("Lokale slettet")', 'toast.success(t("properties.venueDeleted")'],
    ['? "Lokalet er i bruk på bookinger, inventar eller transaksjoner."', '? t("properties.deleteInUse")'],
    ['toast.success("Oppsett fullført — velkommen til dashboardet!")', 'toast.success(t("properties.setupComplete")'],
    ['title="Lokaler"', 'title={t("properties.title")}'],
    ['? "Legg til minst ett lokale for å fullføre oppsettet og komme i gang med bookinger."', '? t("properties.setupDescription")'],
    [': "Registrer og administrer lokaler som brukes i bookinger, inventar og finans."', ': t("properties.defaultDescription")'],
    ['Nytt lokale', '{t("properties.newVenue")}'],
    ['placeholder="Søk lokale …"', 'placeholder={t("properties.searchPlaceholder")}'],
    ['aria-label="Søk lokaler"', 'aria-label={t("properties.searchAria")}'],
    ['Kunne ikke laste lokaler: {loadError}', '{t("properties.loadError", { error: loadError })}'],
    ['Ingen lokaler registrert', '{t("properties.emptyTitle")}'],
    ['? "Opprett ditt første lokale for å knytte bookinger, inventar og transaksjoner."', '? t("properties.emptyCanManage")'],
    [': "Be eier eller administrator om å legge inn lokaler."', ': t("properties.emptyReadOnly")'],
    ['Ingen treff på søket.', '{t("properties.noSearchResults")}'],
    ['Viser {filtered.length} av {properties.length} lokaler', '{t("properties.showingCount", { filtered: filtered.length, total: properties.length })}'],
    ['{isEdit ? "Rediger lokale" : "Nytt lokale"}', '{isEdit ? t("properties.editVenue") : t("properties.newVenue")}'],
    ['placeholder="F.eks. Hovedlokale"', 'placeholder={t("properties.namePlaceholder")}'],
    ['placeholder="Ikke angitt"', 'placeholder={t("properties.typePlaceholder")}'],
    ['placeholder="Kapasitet, parkering, tilgang, …"', 'placeholder={t("properties.notesPlaceholder")}'],
    ['title="Slett lokale?"', 'title={t("properties.deleteTitle")}'],
    ['confirmLabel="Ja, slett lokale"', 'confirmLabel={t("properties.confirmDelete")}'],
    ['? `«${deleteTarget.name}» fjernes permanent. Dette kan ikke gjøres hvis lokalet er knyttet til bookinger, inventar eller transaksjoner.`', '? t("properties.deleteDescription", { name: deleteTarget.name })'],
  ],
};

for (const [file, reps] of Object.entries(fileSpecific)) {
  let content = readFileSync(file, "utf8");
  if (!content.includes('statusLabel') && file.includes('overnatting')) {
    content = content.replace(
      'import { useTranslation } from "@/i18n/client";',
      'import { useTranslation } from "@/i18n/client";\nimport { statusLabel } from "@/lib/navigation/nav-labels";',
    );
  }
  if (file.includes('properties') && !content.includes('statusLabel')) {
    // properties doesn't need statusLabel
  }
  for (const [from, to] of reps) {
    if (content.includes(from)) {
      content = content.split(from).join(to);
    }
  }
  writeFileSync(file, content);
  console.log("Converted", file);
}
