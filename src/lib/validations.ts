import { z } from "zod";

import {
  BOOKING_PAYMENT_STATUS_VALUES,
} from "@/constants/booking-payment-status";
import { USER_ROLES } from "@/constants/roles";

const userRoleSchema = z.enum(USER_ROLES);

export function isUserRole(value: unknown): value is z.infer<typeof userRoleSchema> {
  return userRoleSchema.safeParse(value).success;
}

export const loginSchema = z.object({
  email: z.string().email("Ugyldig e-postadresse"),
  password: z.string().min(8, "Passordet må være minst 8 tegn"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    fullName: z.string().min(1, "Navn er påkrevd"),
    email: z.string().email("Ugyldig e-postadresse"),
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

/** Partnere / leverandører på kundesiden */
export const partnerFormSchema = z.object({
  category: z.enum(PARTNER_CATEGORIES, {
    message: "Velg kategori",
  }),
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
  data: { selectedPackageId: string; selectedAddonIds: string[] },
  packageCatalog: BookingPackageCatalogEntry[],
  addonCatalog: BookingAddonCatalogEntry[],
): number {
  const pkgById = new Map(
    packageCatalog.map((p) => [p.id, Number(p.price)]),
  );
  let total = pkgById.get(data.selectedPackageId) ?? 0;
  const priceById = new Map(addonCatalog.map((a) => [a.id, Number(a.price)]));
  for (const id of data.selectedAddonIds) {
    total += priceById.get(id) ?? 0;
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
  selectedPackageId: z.string().uuid("Velg en pakke"),
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
    if (packageCatalog.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Ingen aktive pakker. Opprett pakker under Priser først.",
        path: ["selectedPackageId"],
      });
      return;
    }
    if (!allowedPackages.has(data.selectedPackageId)) {
      ctx.addIssue({
        code: "custom",
        message: "Ugyldig pakke valgt",
        path: ["selectedPackageId"],
      });
      return;
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
