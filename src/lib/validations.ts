import { z } from "zod";

import {
  BOOKING_PAYMENT_STATUS_VALUES,
} from "@/constants/booking-payment-status";
import { USER_ROLES } from "@/constants/roles";
import { normalizeEmail } from "@/lib/auth/normalize-email";

const userRoleSchema = z.enum(USER_ROLES);

export function isUserRole(value: unknown): value is z.infer<typeof userRoleSchema> {
  return userRoleSchema.safeParse(value).success;
}

const emailField = z
  .string()
  .min(1, "E-post er påkrevd")
  .transform((value) => normalizeEmail(value))
  .pipe(z.string().email("Ugyldig e-postadresse"));

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(8, "Passordet må være minst 8 tegn"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    fullName: z.string().min(1, "Navn er påkrevd"),
    email: emailField,
    password: z.string().min(8, "Passordet må være minst 8 tegn"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passordene er ikke like",
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const customerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  notes: z.string().optional(),
});

export type CustomerInput = z.infer<typeof customerSchema>;

/** Create / edit customer from CRM UI */
export const customerUpsertFormSchema = z.object({
  name: z.string().min(1, "Navn er påkrevd"),
  phone: z.union([
    z.literal(""),
    z.string().min(3, "Telefon må være minst 3 tegn"),
  ]),
  email: z.union([
    z.literal(""),
    z.string().email("Ugyldig e-post"),
  ]),
});

export type CustomerUpsertFormInput = z.infer<typeof customerUpsertFormSchema>;

export const PARTNER_CATEGORIES = [
  "catering",
  "decoration",
  "cleaning",
  "other",
] as const;

export type PartnerCategory = (typeof PARTNER_CATEGORIES)[number];

export const PARTNER_CATEGORY_PRESETS = [
  { value: "catering", label: "Catering" },
  { value: "decoration", label: "Dekorasjon" },
  { value: "cleaning", label: "Renhold" },
  { value: "other", label: "Annet" },
] as const;

export const PARTNER_CATEGORY_SUGGESTIONS = PARTNER_CATEGORY_PRESETS.map(
  (preset) => preset.label,
);

export function partnerCategoryToLabel(category: string): string {
  const preset = PARTNER_CATEGORY_PRESETS.find((p) => p.value === category);
  return preset?.label ?? category;
}

export function partnerLabelToCategory(input: string): string {
  const trimmed = input.trim();
  const preset = PARTNER_CATEGORY_PRESETS.find(
    (p) => p.label.toLowerCase() === trimmed.toLowerCase(),
  );
  return preset?.value ?? trimmed;
}

/** Partnere / leverandører på kundesiden */
export const partnerFormSchema = z.object({
  category: z
    .string()
    .transform((s) => partnerLabelToCategory(s))
    .pipe(
      z
        .string()
        .min(2, "Kategori må være minst 2 tegn")
        .max(80, "Maks 80 tegn"),
    ),
  name: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(2, "Navn må være minst 2 tegn").max(200)),
  phone: z.union([
    z.literal(""),
    z.string().min(3, "Telefon må være minst 3 tegn"),
  ]),
  email: z.union([z.literal(""), z.string().email("Ugyldig e-post")]),
  notes: z.string().max(4000, "Maks 4000 tegn").optional(),
});

export type PartnerFormInput = z.infer<typeof partnerFormSchema>;

export const PROPERTY_TYPES = [
  "selskaplokale",
  "gård",
  "møterom",
  "festlokale",
  "annet",
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

/** Lokaler / eiendommer (properties) */
export const propertyFormSchema = z.object({
  name: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(2, "Navn må være minst 2 tegn").max(200)),
  address: z.union([
    z.literal(""),
    z.string().min(3, "Adresse må være minst 3 tegn"),
  ]),
  type: z.union([z.literal(""), z.enum(PROPERTY_TYPES)]),
  notes: z.string().max(4000, "Maks 4000 tegn").optional(),
});

export type PropertyFormInput = z.infer<typeof propertyFormSchema>;

/** Organisasjonsprofil / fakturaavsender */
export const organizationProfileFormSchema = z.object({
  name: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(2, "Navn må være minst 2 tegn").max(200)),
  legalName: z.string().max(200),
  tagline: z.string().max(200),
  orgNumber: z.string().max(20),
  addressLine1: z.string().max(200),
  addressLine2: z.string().max(200),
  postalCode: z.string().max(12),
  city: z.string().max(100),
  contactEmail: z.union([
    z.literal(""),
    z.string().email("Ugyldig e-postadresse"),
  ]),
  contactPhone: z.string().max(30),
  logoUrl: z.union([z.literal(""), z.string().url("Ugyldig URL")]),
  bankAccount: z.string().max(200),
  paymentInstructions: z.string().max(2000, "Maks 2000 tegn"),
});

export type OrganizationProfileFormInput = z.infer<
  typeof organizationProfileFormSchema
>;

export const teamMemberAddSchema = z.object({
  email: z
    .string()
    .transform((s) => s.trim().toLowerCase())
    .pipe(z.string().email("Skriv inn en gyldig e-postadresse")),
  role: z.enum(["admin", "manager", "accountant", "viewer"]),
});

export type TeamMemberAddInput = z.infer<typeof teamMemberAddSchema>;

export const bookingSchema = z.object({
  customerId: z.string().uuid(),
  propertyId: z.string().uuid(),
  eventType: z.string().min(1),
  eventDate: z.string().min(1),
  guestCount: z.coerce.number().int().nonnegative(),
  status: z.string().min(1),
  totalPrice: z.coerce.number().nonnegative(),
  paidAmount: z.coerce.number().nonnegative(),
  remainingAmount: z.coerce.number().nonnegative(),
  notes: z.string().optional(),
});

export type BookingInput = z.infer<typeof bookingSchema>;

export const transactionSchema = z.object({
  propertyId: z.string().uuid(),
  type: z.string().min(1),
  category: z.string().min(1),
  description: z.string().optional(),
  amount: z.coerce.number(),
  transactionDate: z.string().min(1),
});

export type TransactionInput = z.infer<typeof transactionSchema>;

export const assetSchema = z.object({
  propertyId: z.string().uuid(),
  name: z.string().min(1),
  quantity: z.coerce.number().int().nonnegative(),
  value: z.coerce.number().nonnegative(),
  condition: z.string().optional(),
  insuranceStatus: z.string().optional(),
});

export type AssetInput = z.infer<typeof assetSchema>;

export const assetFormSchema = z.object({
  propertyId: z.string().min(1, "Velg lokale").uuid("Ugyldig lokale"),
  name: z.string().min(1, "Navn er påkrevd"),
  quantity: z.coerce.number().int().min(0, "Antall kan ikke være negativt"),
  value: z.coerce.number().min(0, "Verdi kan ikke være negativ"),
  condition: z.string().optional(),
  insuranceStatus: z.string().optional(),
});

export type AssetFormInput = z.infer<typeof assetFormSchema>;

/** @deprecated Bruk priser fra `public.packages` via BookingPackageCatalogEntry */
export const NEW_BOOKING_PACKAGE_BASE_NOK = {
  basic: 8_500,
  premium: 18_500,
  luxury: 32_000,
} as const;

export type NewBookingPackageTier = keyof typeof NEW_BOOKING_PACKAGE_BASE_NOK;

/** Aktive pakker fra `public.packages` (id + pris for estimat). */
export type BookingPackageCatalogEntry = { id: string; price: number };

/** Tillegg fra `public.services` (id + pris for estimat og validering). */
export type BookingAddonCatalogEntry = { id: string; price: number };

export function estimateNewBookingTotalNok(
  data: {
    packageSource: "catalog" | "custom";
    selectedPackageId: string;
    selectedAddonIds: string[];
    customPackagePrice: number;
    customAddonLines: { name: string; priceNok: number }[];
  },
  packageCatalog: BookingPackageCatalogEntry[],
  addonCatalog: BookingAddonCatalogEntry[],
): number {
  let total = 0;

  if (data.packageSource === "custom") {
    total = Number.isFinite(data.customPackagePrice)
      ? Number(data.customPackagePrice)
      : 0;
  } else {
    const pkgById = new Map(
      packageCatalog.map((p) => [p.id, Number(p.price)]),
    );
    total = pkgById.get(data.selectedPackageId) ?? 0;
  }

  const priceById = new Map(addonCatalog.map((a) => [a.id, Number(a.price)]));
  for (const id of new Set(data.selectedAddonIds)) {
    total += priceById.get(id) ?? 0;
  }

  for (const line of data.customAddonLines ?? []) {
    const p = Number(line.priceNok);
    const price = Number.isFinite(p) ? p : 0;
    const hasName = Boolean(line.name?.trim());
    if (!hasName && price <= 0) continue;
    total += price;
  }

  return total;
}

const BOOKING_PACKAGE_NAME_ORDER = [
  "basis",
  "plus",
  "premium",
  "luksus",
  "luxury",
] as const;

/** Samme rekkefølge som i Priser (navn-mønster). */
export function sortBookingPackagesByCatalogOrder<
  T extends { name: string },
>(packages: T[]): T[] {
  const tierIndex = (name: string) => {
    const n = name.toLowerCase();
    for (let i = 0; i < BOOKING_PACKAGE_NAME_ORDER.length; i++) {
      if (n.includes(BOOKING_PACKAGE_NAME_ORDER[i])) return i;
    }
    return 100;
  };
  return [...packages].sort((a, b) => {
    const d = tierIndex(a.name) - tierIndex(b.name);
    if (d !== 0) return d;
    return a.name.localeCompare(b.name, "nb");
  });
}

/** Undertittel eller første punkt fra pakkebeskrivelse (samme konvensjon som Priser). */
export function bookingPackageListBlurb(description: string | null): string {
  if (!description?.trim()) return "";
  const lines = description
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return "";
  const first = lines[0]!;
  if (!/^[-•*]/.test(first)) return first;
  return first.replace(/^\s*[-•*]\s*/, "").trim() || "";
}

export const NEW_BOOKING_EVENT_TYPES = ["Bedrift", "Privat"] as const;
export type NewBookingEventType = (typeof NEW_BOOKING_EVENT_TYPES)[number];

/** Preset + `__annet__` for egen tekst i skjemaet. */
export const NEW_BOOKING_FEST_TYPE_ANNET = "__annet__" as const;
export const NEW_BOOKING_FEST_TYPE_PRESETS = [
  "Bryllup",
  "Konfirmasjon",
  "Dåp",
  "Bursdag",
  "Julebord",
  "Firmafest",
  "Minnesamvær",
] as const;

const NEW_BOOKING_FEST_TYPE_VALUES = [
  ...NEW_BOOKING_FEST_TYPE_PRESETS,
  NEW_BOOKING_FEST_TYPE_ANNET,
] as const;

export type NewBookingFestTypeField = (typeof NEW_BOOKING_FEST_TYPE_VALUES)[number];

export function resolveNewBookingFestTypeStored(data: {
  festType: NewBookingFestTypeField;
  festTypeCustom?: string | null;
}): string {
  if (data.festType === NEW_BOOKING_FEST_TYPE_ANNET) {
    return (data.festTypeCustom ?? "").trim();
  }
  return data.festType;
}

/** Local calendar yyyy-mm-dd; rejects invalid calendar dates. */
export function parseBookingDateLocal(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
  const dt = new Date(y, mo - 1, d);
  return (
    dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d
  );
}

export function todayLocalYmd(): string {
  const n = new Date();
  const y = n.getFullYear();
  const month = String(n.getMonth() + 1).padStart(2, "0");
  const day = String(n.getDate()).padStart(2, "0");
  return `${y}-${month}-${day}`;
}

const phoneWhenPresentSchema = z
  .string()
  .min(8, "Telefonnummeret er for kort")
  .regex(
    /^[+]?[\d][\d\s\-/]{5,}\d$/,
    "Ugyldig telefonnummer (bruk siffer, +47, mellomrom eller bindestrek)",
  );

const optionalBookingTimeSchema = z
  .string()
  .transform((s) => s.trim())
  .pipe(
    z.union([
      z.literal(""),
      z
        .string()
        .regex(
          /^([01]?\d|2[0-3]):[0-5]\d$/,
          "Ugyldig klokkeslett (bruk HH:MM)",
        ),
    ]),
  );

export const newBookingFormFieldsSchema = z.object({
  customerName: z
    .string()
    .min(1, "Navn er påkrevd")
    .transform((s) => s.trim())
    .pipe(z.string().min(2, "Navnet må være minst 2 tegn")),
  phone: z
    .string()
    .transform((s) => s.trim())
    .pipe(
      z
        .string()
        .min(1, "Telefon er påkrevd")
        .pipe(phoneWhenPresentSchema),
    ),
  email: z.union([
    z.literal(""),
    z.string().email("Ugyldig e-post"),
  ]),
  address: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().max(300, "Adresse kan ikke overstige 300 tegn")),
  festType: z
    .string()
    .min(1, "Velg festtype")
    .pipe(
      z.enum(NEW_BOOKING_FEST_TYPE_VALUES, {
        message: "Velg festtype",
      }),
    ),
  festTypeCustom: z.string().max(120, "Maks 120 tegn").optional(),
  eventType: z
    .string()
    .min(1, "Velg bedrift eller privat")
    .pipe(
      z.enum(NEW_BOOKING_EVENT_TYPES, {
        message: "Velg bedrift eller privat",
      }),
    ),
  eventDate: z
    .string()
    .min(1, "Velg dato")
    .refine((s) => parseBookingDateLocal(s), { message: "Ugyldig dato" })
    .refine((s) => s >= todayLocalYmd(), {
      message: "Dato kan ikke ligge i fortiden",
    }),
  eventEndDate: z
    .string()
    .transform((s) => s.trim())
    .refine((s) => s === "" || parseBookingDateLocal(s), {
      message: "Ugyldig sluttdato",
    })
    .refine((s) => s === "" || s >= todayLocalYmd(), {
      message: "Sluttdato kan ikke ligge i fortiden",
    }),
  eventStartTime: optionalBookingTimeSchema,
  eventEndTime: optionalBookingTimeSchema,
  guestCount: z.coerce
    .number({ error: "Oppgi antall gjester" })
    .int("Antall gjester må være et heltall")
    .min(1, "Oppgi minst én gjest")
    .max(50_000, "Antall gjester virker urealistisk høyt"),
  packageSource: z.enum(["catalog", "custom"]),
  selectedPackageId: z.union([
    z.literal(""),
    z.string().uuid("Velg en pakke"),
  ]),
  customPackageName: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().max(200, "Maks 200 tegn")),
  customPackagePrice: z.coerce
    .number({ error: "Ugyldig pris" })
    .min(0, "Pris kan ikke være negativ"),
  customAddonLines: z.array(
    z.object({
      name: z.string(),
      priceNok: z.coerce.number().min(0, "Pris kan ikke være negativ"),
    }),
  ),
  selectedAddonIds: z.array(z.string().uuid()),
  depositPaid: z.coerce
    .number({ error: "Ugyldig depositum" })
    .min(0, "Depositum kan ikke være negativt"),
  /** Faktisk pris på bookingen; kan være lavere enn estimat (rabatt) eller høyere. */
  agreedTotal: z.coerce
    .number({ error: "Ugyldig avtalt pris" })
    .min(0, "Avtalt total kan ikke være negativ")
    .refine((n) => Number.isFinite(n), { message: "Ugyldig avtalt pris" }),
  notes: z.string().max(8000, "Notatet er for langt (maks 8000 tegn)").optional(),
  /** Valgfri egen referanse / saksnummer (lagres som `booking_reference`). */
  bookingReference: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().max(120, "Referanse kan ikke overstige 120 tegn")),
}).superRefine((data, ctx) => {
  const end = data.eventEndDate.trim();
  if (end && end < data.eventDate) {
    ctx.addIssue({
      code: "custom",
      message: "Sluttdato kan ikke være før startdato",
      path: ["eventEndDate"],
    });
  }
});

export type NewBookingFormInput = z.infer<typeof newBookingFormFieldsSchema>;

/** Redigering av eksisterende booking (sidepanel); dato kan ligge i fortiden. */
export const bookingDetailEditSchema = z
  .object({
    customerName: z
      .string()
      .transform((s) => s.trim())
      .pipe(z.string().min(2, "Navn må være minst 2 tegn").max(200)),
    phone: z
      .string()
      .transform((s) => s.trim())
      .pipe(z.string().min(1, "Telefon er påkrevd").pipe(phoneWhenPresentSchema)),
    email: z.union([z.literal(""), z.string().email("Ugyldig e-post")]),
    address: z
      .string()
      .transform((s) => s.trim())
      .pipe(z.string().max(300, "Adresse kan ikke overstige 300 tegn")),
    bookingReference: z
      .string()
      .transform((s) => s.trim())
      .pipe(z.string().max(120, "Referanse kan ikke overstige 120 tegn")),
    festType: z
      .string()
      .transform((s) => s.trim())
      .pipe(z.string().min(1, "Oppgi type fest").max(120)),
    eventType: z.enum(NEW_BOOKING_EVENT_TYPES, {
      message: "Velg Bedrift eller Privat",
    }),
    eventDate: z
      .string()
      .min(1, "Velg dato")
      .refine((s) => parseBookingDateLocal(s), { message: "Ugyldig dato" }),
    eventEndDate: z
      .string()
      .transform((s) => s.trim())
      .refine((s) => s === "" || parseBookingDateLocal(s), {
        message: "Ugyldig sluttdato",
      }),
    eventStartTime: optionalBookingTimeSchema,
    eventEndTime: optionalBookingTimeSchema,
    guestCount: z.coerce
      .number({ error: "Oppgi antall gjester" })
      .int("Antall gjester må være et heltall")
      .min(1, "Oppgi minst én gjest")
      .max(50_000, "Antall gjester virker urealistisk høyt"),
    totalNok: z.coerce
      .number({ error: "Ugyldig totalpris" })
      .min(0, "Totalpris kan ikke være negativ"),
    paidNok: z.coerce
      .number({ error: "Ugyldig innbetaling" })
      .min(0, "Innbetaling kan ikke være negativ"),
    paymentStatus: z.enum(BOOKING_PAYMENT_STATUS_VALUES),
    paymentDueDate: z
      .string()
      .transform((s) => s.trim())
      .refine((s) => s === "" || parseBookingDateLocal(s), {
        message: "Ugyldig forfallsdato",
      }),
    notes: z.string().max(8000, "Notatet er for langt (maks 8000 tegn)").optional(),
  })
  .superRefine((data, ctx) => {
    const end = data.eventEndDate.trim();
    if (end && end < data.eventDate) {
      ctx.addIssue({
        code: "custom",
        message: "Sluttdato kan ikke være før startdato",
        path: ["eventEndDate"],
      });
    }
    if (data.paidNok > data.totalNok) {
      ctx.addIssue({
        code: "custom",
        message: "Innbetaling kan ikke overstige avtalt total",
        path: ["paidNok"],
      });
    }
  });

export type BookingDetailEditInput = z.infer<typeof bookingDetailEditSchema>;

export function createNewBookingFormSchema(
  addonCatalog: BookingAddonCatalogEntry[],
  packageCatalog: BookingPackageCatalogEntry[],
) {
  const allowedAddons = new Set(addonCatalog.map((a) => a.id));
  const allowedPackages = new Set(packageCatalog.map((p) => p.id));
  return newBookingFormFieldsSchema.superRefine((data, ctx) => {
    if (data.packageSource === "catalog") {
      if (packageCatalog.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: "Ingen aktive pakker. Velg egen pakkepris eller opprett pakker under Priser.",
          path: ["packageSource"],
        });
        return;
      }
      if (
        !data.selectedPackageId ||
        !allowedPackages.has(data.selectedPackageId)
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Velg en pakke",
          path: ["selectedPackageId"],
        });
        return;
      }
    } else if (data.packageSource === "custom") {
      if (data.customPackageName.trim().length < 1) {
        ctx.addIssue({
          code: "custom",
          message: "Oppgi navn på pakke / prisgrunnlag",
          path: ["customPackageName"],
        });
      }
    }

    if (data.festType === NEW_BOOKING_FEST_TYPE_ANNET) {
      const t = data.festTypeCustom?.trim() ?? "";
      if (!t) {
        ctx.addIssue({
          code: "custom",
          message: "Beskriv festtypen",
          path: ["festTypeCustom"],
        });
      }
    }
    for (const id of data.selectedAddonIds) {
      if (!allowedAddons.has(id)) {
        ctx.addIssue({
          code: "custom",
          message: "Ugyldig tillegg valgt",
          path: ["selectedAddonIds"],
        });
        return;
      }
    }
    if (data.depositPaid > data.agreedTotal) {
      ctx.addIssue({
        code: "custom",
        message: "Depositum kan ikke overstige avtalt totalpris",
        path: ["depositPaid"],
      });
    }
  });
}

const pricingCatalogFormFields = {
  name: z.string().min(1, "Navn er påkrevd"),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Pris kan ikke være negativ"),
  active: z.boolean(),
};

export const pricingPackageFormSchema = z.object(pricingCatalogFormFields);
export const pricingServiceFormSchema = z.object(pricingCatalogFormFields);

export type PricingPackageFormInput = z.infer<typeof pricingPackageFormSchema>;
export type PricingServiceFormInput = z.infer<typeof pricingServiceFormSchema>;

export const transactionFormSchema = z.object({
  propertyId: z.string().min(1, "Velg lokale").uuid("Ugyldig lokale"),
  type: z.enum(["income", "expense"]),
  category: z.string().min(1, "Kategori er påkrevd"),
  description: z.string().optional(),
  amount: z.coerce.number().positive("Beløp må være større enn 0"),
  transactionDate: z.string().min(1, "Velg dato"),
});

export type TransactionFormInput = z.infer<typeof transactionFormSchema>;

// --- Forespørsler (booking_inquiries) — brukes av inquiries-modulen
export const BOOKING_INQUIRY_STATUSES = [
  "new",
  "contacted",
  "quote_sent",
  "awaiting_customer",
  "converted",
  "lost",
] as const;

export type BookingInquiryStatus = (typeof BOOKING_INQUIRY_STATUSES)[number];

export const BOOKING_INQUIRY_FORM_STATUSES = [
  "new",
  "contacted",
  "quote_sent",
  "awaiting_customer",
  "lost",
] as const;

export type BookingInquiryFormStatus =
  (typeof BOOKING_INQUIRY_FORM_STATUSES)[number];

export const bookingInquiryFormSchema = z
  .object({
    customerId: z.union([z.literal(""), z.string().uuid("Ugyldig kunde")]),
    newCustomerName: z
      .string()
      .transform((s) => s.trim())
      .pipe(z.string().max(200)),
    newCustomerPhone: z
      .string()
      .transform((s) => s.trim())
      .pipe(z.string().max(40)),
    newCustomerEmail: z.union([
      z.literal(""),
      z.string().email("Ugyldig e-post"),
    ]),
    newCustomerAddress: z
      .string()
      .transform((s) => s.trim())
      .pipe(z.string().max(300)),
    propertyId: z.union([z.literal(""), z.string().uuid("Ugyldig lokale")]),
    eventType: z.enum(NEW_BOOKING_EVENT_TYPES, {
      message: "Velg bedrift eller privat",
    }),
    festType: z
      .string()
      .transform((s) => s.trim())
      .pipe(z.string().max(120)),
    preferredEventDate: z
      .string()
      .transform((s) => s.trim())
      .refine((s) => s === "" || parseBookingDateLocal(s), {
        message: "Ugyldig ønsket dato",
      }),
    preferredEventEndDate: z
      .string()
      .transform((s) => s.trim())
      .refine((s) => s === "" || parseBookingDateLocal(s), {
        message: "Ugyldig sluttdato",
      }),
    guestCount: z.coerce
      .number({ error: "Oppgi antall gjester" })
      .int("Antall gjester må være et heltall")
      .min(0, "Antall gjester kan ikke være negativt")
      .max(50_000, "Antall gjester virker urealistisk høyt"),
    estimatedTotal: z.preprocess((v) => {
      if (v === "" || v === undefined || v === null) return undefined;
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) ? n : undefined;
    }, z.number().min(0, "Beløp kan ikke være negativt").optional()),
    status: z.enum(BOOKING_INQUIRY_FORM_STATUSES, {
      message: "Velg status",
    }),
    nextFollowUpAt: z
      .string()
      .transform((s) => s.trim())
      .refine((s) => s === "" || !Number.isNaN(Date.parse(s)), {
        message: "Ugyldig tidspunkt for oppfølging",
      }),
    internalNotes: z.string().max(8000, "Maks 8000 tegn").optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.customerId) {
      if (data.newCustomerName.length < 2) {
        ctx.addIssue({
          code: "custom",
          message: "Navn er påkrevd (minst 2 tegn)",
          path: ["newCustomerName"],
        });
      }
      if (data.newCustomerPhone.length < 3) {
        ctx.addIssue({
          code: "custom",
          message: "Telefon er påkrevd (minst 3 tegn)",
          path: ["newCustomerPhone"],
        });
      }
    }
    const start = data.preferredEventDate;
    const end = data.preferredEventEndDate;
    if (start && end && end < start) {
      ctx.addIssue({
        code: "custom",
        message: "Sluttdato kan ikke være før startdato",
        path: ["preferredEventEndDate"],
      });
    }
  });

export type BookingInquiryFormInput = z.infer<typeof bookingInquiryFormSchema>;

export const inquiryActivityNoteSchema = z.object({
  body: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1, "Skriv en melding").max(8000, "Maks 8000 tegn")),
});

export type InquiryActivityNoteInput = z.infer<typeof inquiryActivityNoteSchema>;

// --- Overnatting
export const ACCOMMODATION_RESERVATION_STATUSES = [
  "tentative",
  "confirmed",
  "cancelled",
] as const;

export type AccommodationReservationStatus =
  (typeof ACCOMMODATION_RESERVATION_STATUSES)[number];

const accommodationHhMmOptional = z
  .string()
  .transform((s) => s.trim())
  .refine((s) => s === "" || /^(\d|[01]\d|2[0-3]):[0-5]\d$/.test(s), {
    message: "Ugyldig klokkeslett (HH:MM)",
  });

export const accommodationReservationFormSchema = z
  .object({
    customerId: z.union([z.literal(""), z.string().uuid("Ugyldig kunde")]),
    newCustomerName: z
      .string()
      .transform((s) => s.trim())
      .pipe(z.string().max(200)),
    newCustomerPhone: z
      .string()
      .transform((s) => s.trim())
      .pipe(z.string().max(40)),
    newCustomerEmail: z.union([
      z.literal(""),
      z.string().email("Ugyldig e-post"),
    ]),
    newCustomerAddress: z
      .string()
      .transform((s) => s.trim())
      .pipe(z.string().max(300)),
    unitId: z.string().uuid("Velg enhet"),
    checkInDate: z
      .string()
      .transform((s) => s.trim())
      .refine((s) => parseBookingDateLocal(s), { message: "Ugyldig ankomstdato" }),
    checkOutDate: z
      .string()
      .transform((s) => s.trim())
      .refine((s) => parseBookingDateLocal(s), { message: "Ugyldig avreisedato" }),
    checkInTime: accommodationHhMmOptional,
    checkOutTime: accommodationHhMmOptional,
    guestCount: z.coerce
      .number({ error: "Oppgi antall gjester" })
      .int("Antall gjester må være et heltall")
      .min(1, "Minst én gjest")
      .max(100, "Antall gjester virker urealistisk høyt"),
    status: z.enum(ACCOMMODATION_RESERVATION_STATUSES, {
      message: "Velg status",
    }),
    notes: z.string().max(8000, "Maks 8000 tegn").optional(),
    totalPrice: z.preprocess((v) => {
      if (v === "" || v === undefined || v === null) return undefined;
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) ? n : undefined;
    }, z.number().min(0, "Beløp kan ikke være negativt").optional()),
  })
  .superRefine((data, ctx) => {
    if (!data.customerId) {
      if (data.newCustomerName.length < 2) {
        ctx.addIssue({
          code: "custom",
          message: "Navn er påkrevd (minst 2 tegn)",
          path: ["newCustomerName"],
        });
      }
      if (data.newCustomerPhone.length < 3) {
        ctx.addIssue({
          code: "custom",
          message: "Telefon er påkrevd (minst 3 tegn)",
          path: ["newCustomerPhone"],
        });
      }
    }
    if (data.checkInDate >= data.checkOutDate) {
      ctx.addIssue({
        code: "custom",
        message: "Avreisedato må være etter ankomst",
        path: ["checkOutDate"],
      });
    }
  });

export type AccommodationReservationFormInput = z.infer<
  typeof accommodationReservationFormSchema
>;

export const accommodationReservationEditSchema = z
  .object({
    unitId: z.string().uuid("Velg enhet"),
    checkInDate: z
      .string()
      .transform((s) => s.trim())
      .refine((s) => parseBookingDateLocal(s), { message: "Ugyldig ankomstdato" }),
    checkOutDate: z
      .string()
      .transform((s) => s.trim())
      .refine((s) => parseBookingDateLocal(s), { message: "Ugyldig avreisedato" }),
    checkInTime: accommodationHhMmOptional,
    checkOutTime: accommodationHhMmOptional,
    guestCount: z.coerce
      .number({ error: "Oppgi antall gjester" })
      .int()
      .min(1)
      .max(100),
    status: z.enum(ACCOMMODATION_RESERVATION_STATUSES, {
      message: "Velg status",
    }),
    notes: z.string().max(8000).optional(),
    totalPrice: z.preprocess((v) => {
      if (v === "" || v === undefined || v === null) return undefined;
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) ? n : undefined;
    }, z.number().min(0).optional()),
  })
  .superRefine((data, ctx) => {
    if (data.checkInDate >= data.checkOutDate) {
      ctx.addIssue({
        code: "custom",
        message: "Avreisedato må være etter ankomst",
        path: ["checkOutDate"],
      });
    }
  });

export type AccommodationReservationEditInput = z.infer<
  typeof accommodationReservationEditSchema
>;

export const accommodationUnitFormSchema = z.object({
  name: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(1, "Navn er påkrevd").max(200)),
  propertyId: z.union([z.literal(""), z.string().uuid("Ugyldig lokale")]),
  maxGuests: z.coerce
    .number({ error: "Oppgi kapasitet" })
    .int()
    .min(1, "Minst 1 gjest")
    .max(100, "Maks 100"),
  notes: z.string().max(2000, "Maks 2000 tegn").optional(),
  active: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
});

export type AccommodationUnitFormInput = z.infer<typeof accommodationUnitFormSchema>;
