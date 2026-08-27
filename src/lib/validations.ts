import { z } from "zod";

import {
  BOOKING_PAYMENT_STATUS_VALUES,
} from "@/constants/booking-payment-status";
import { USER_ROLES } from "@/constants/roles";
import { normalizeEmail } from "@/lib/auth/normalize-email";
import {
  type ValidationMessages,
  defaultValidationMessages,
  validationMessagesForLocale,
} from "@/lib/validations/messages";

export {
  type ValidationMessages,
  defaultValidationMessages,
  validationMessagesForLocale,
} from "@/lib/validations/messages";

const userRoleSchema = z.enum(USER_ROLES);

export function isUserRole(value: unknown): value is z.infer<typeof userRoleSchema> {
  return userRoleSchema.safeParse(value).success;
}

function createEmailField(msg: ValidationMessages) {
  return z
    .string()
    .min(1, msg.emailRequired)
    .transform((value) => normalizeEmail(value))
    .pipe(z.string().email(msg.invalidEmail));
}

function createPhoneWhenPresentSchema(msg: ValidationMessages) {
  return z
    .string()
    .min(8, msg.phoneTooShort)
    .regex(
      /^[+]?[\d][\d\s\-/]{5,}\d$/,
      msg.invalidPhoneFormat,
    );
}

function createOptionalBookingTimeSchema(msg: ValidationMessages) {
  return z
    .string()
    .transform((s) => s.trim())
    .pipe(
      z.union([
        z.literal(""),
        z
          .string()
          .regex(
            /^([01]?\d|2[0-3]):[0-5]\d$/,
            msg.invalidTime,
          ),
      ]),
    );
}

function createAccommodationHhMmOptional(msg: ValidationMessages) {
  return z
    .string()
    .transform((s) => s.trim())
    .refine((s) => s === "" || /^(\d|[01]\d|2[0-3]):[0-5]\d$/.test(s), {
      message: msg.invalidTimeShort,
    });
}

export function createLoginSchema(msg: ValidationMessages) {
  return z.object({
    email: createEmailField(msg),
    password: z.string().min(8, msg.passwordTooShort),
  });
}

export const loginSchema = createLoginSchema(defaultValidationMessages);

export type LoginInput = z.infer<typeof loginSchema>;

export function createRegisterSchema(msg: ValidationMessages) {
  return z
    .object({
      fullName: z.string().min(1, msg.nameRequired),
      email: createEmailField(msg),
      password: z.string().min(8, msg.passwordTooShort),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      path: ["confirmPassword"],
      message: msg.passwordsMismatch,
    });
}

export const registerSchema = createRegisterSchema(defaultValidationMessages);

export type RegisterInput = z.infer<typeof registerSchema>;

export const customerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  notes: z.string().optional(),
});

export type CustomerInput = z.infer<typeof customerSchema>;

/** Create / edit customer from CRM UI */
export function createCustomerUpsertFormSchema(msg: ValidationMessages) {
  return z.object({
    name: z.string().min(1, msg.nameRequired),
    phone: z.union([
      z.literal(""),
      z.string().min(3, msg.phoneMin3),
    ]),
    email: z.union([
      z.literal(""),
      z.string().email(msg.invalidEmailShort),
    ]),
  });
}

export const customerUpsertFormSchema = createCustomerUpsertFormSchema(
  defaultValidationMessages,
);

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
export function createPartnerFormSchema(msg: ValidationMessages) {
  return z.object({
    category: z
      .string()
      .transform((s) => partnerLabelToCategory(s))
      .pipe(
        z
          .string()
          .min(2, msg.categoryMin2)
          .max(80, msg.max80),
      ),
    name: z
      .string()
      .transform((s) => s.trim())
      .pipe(z.string().min(2, msg.nameMin2).max(200)),
    phone: z.union([
      z.literal(""),
      z.string().min(3, msg.phoneMin3),
    ]),
    email: z.union([z.literal(""), z.string().email(msg.invalidEmailShort)]),
    notes: z.string().max(4000, msg.max4000).optional(),
  });
}

export const partnerFormSchema = createPartnerFormSchema(defaultValidationMessages);

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
export function createPropertyFormSchema(msg: ValidationMessages) {
  return z.object({
    name: z
      .string()
      .transform((s) => s.trim())
      .pipe(z.string().min(2, msg.nameMin2).max(200)),
    address: z.union([
      z.literal(""),
      z.string().min(3, msg.addressMin3),
    ]),
    type: z.union([z.literal(""), z.enum(PROPERTY_TYPES)]),
    notes: z.string().max(4000, msg.max4000).optional(),
  });
}

export const propertyFormSchema = createPropertyFormSchema(defaultValidationMessages);

export type PropertyFormInput = z.infer<typeof propertyFormSchema>;

/** Organisasjonsprofil / fakturaavsender */
export function createOrganizationProfileFormSchema(msg: ValidationMessages) {
  return z.object({
    name: z
      .string()
      .transform((s) => s.trim())
      .pipe(z.string().min(2, msg.nameMin2).max(200)),
    legalName: z.string().max(200),
    tagline: z.string().max(200),
    orgNumber: z.string().max(20),
    addressLine1: z.string().max(200),
    addressLine2: z.string().max(200),
    postalCode: z.string().max(12),
    city: z.string().max(100),
    contactEmail: z.union([
      z.literal(""),
      z.string().email(msg.invalidEmail),
    ]),
    contactPhone: z.string().max(30),
    logoUrl: z.union([z.literal(""), z.string().url(msg.urlInvalid)]),
    bankAccount: z.string().max(200),
    paymentInstructions: z.string().max(2000, msg.max2000),
  });
}

export const organizationProfileFormSchema = createOrganizationProfileFormSchema(
  defaultValidationMessages,
);

export type OrganizationProfileFormInput = z.infer<
  typeof organizationProfileFormSchema
>;

export function createTeamMemberAddSchema(msg: ValidationMessages) {
  return z.object({
    email: z
      .string()
      .transform((s) => s.trim().toLowerCase())
      .pipe(z.string().email(msg.validEmailEnter)),
    role: z.enum(["admin", "manager", "accountant", "viewer"]),
  });
}

export const teamMemberAddSchema = createTeamMemberAddSchema(defaultValidationMessages);

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

export function createAssetFormSchema(msg: ValidationMessages) {
  return z.object({
    propertyId: z.string().min(1, msg.selectProperty).uuid(msg.invalidProperty),
    name: z.string().min(1, msg.nameRequired),
    quantity: z.coerce.number().int().min(0, msg.quantityNonNegative),
    value: z.coerce.number().min(0, msg.valueNonNegative),
    condition: z.string().optional(),
    insuranceStatus: z.string().optional(),
  });
}

export const assetFormSchema = createAssetFormSchema(defaultValidationMessages);

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

export function createNewBookingFormFieldsSchema(msg: ValidationMessages) {
  const phoneWhenPresentSchema = createPhoneWhenPresentSchema(msg);
  const optionalBookingTimeSchema = createOptionalBookingTimeSchema(msg);

  return z.object({
    customerName: z
      .string()
      .min(1, msg.nameRequired)
      .transform((s) => s.trim())
      .pipe(z.string().min(2, msg.nameMin2Chars)),
    phone: z
      .string()
      .transform((s) => s.trim())
      .pipe(
        z
          .string()
          .min(1, msg.phoneRequired)
          .pipe(phoneWhenPresentSchema),
      ),
    email: z.union([
      z.literal(""),
      z.string().email(msg.invalidEmailShort),
    ]),
    address: z
      .string()
      .transform((s) => s.trim())
      .pipe(z.string().max(300, msg.addressMax300)),
    festType: z
      .string()
      .min(1, msg.selectType)
      .pipe(
        z.enum(NEW_BOOKING_FEST_TYPE_VALUES, {
          message: msg.selectType,
        }),
      ),
    festTypeCustom: z.string().max(120, msg.max120).optional(),
    eventType: z
      .string()
      .min(1, msg.selectBusinessOrPrivate)
      .pipe(
        z.enum(NEW_BOOKING_EVENT_TYPES, {
          message: msg.selectBusinessOrPrivate,
        }),
      ),
    eventDate: z
      .string()
      .min(1, msg.selectDate)
      .refine((s) => parseBookingDateLocal(s), { message: msg.invalidDate })
      .refine((s) => s >= todayLocalYmd(), {
        message: msg.dateNotInPast,
      }),
    eventEndDate: z
      .string()
      .transform((s) => s.trim())
      .refine((s) => s === "" || parseBookingDateLocal(s), {
        message: msg.invalidEndDate,
      })
      .refine((s) => s === "" || s >= todayLocalYmd(), {
        message: msg.endDateNotInPast,
      }),
    eventStartTime: optionalBookingTimeSchema,
    eventEndTime: optionalBookingTimeSchema,
    guestCount: z.coerce
      .number({ error: msg.guestCountRequired })
      .int(msg.guestCountInteger)
      .min(1, msg.guestCountMin1)
      .max(50_000, msg.guestCountTooHigh),
    packageSource: z.enum(["catalog", "custom"]),
    selectedPackageId: z.union([
      z.literal(""),
      z.string().uuid(msg.selectPackage),
    ]),
    customPackageName: z
      .string()
      .transform((s) => s.trim())
      .pipe(z.string().max(200, msg.max200)),
    customPackagePrice: z.coerce
      .number({ error: msg.invalidPrice })
      .min(0, msg.priceNonNegative),
    customAddonLines: z.array(
      z.object({
        name: z.string(),
        priceNok: z.coerce.number().min(0, msg.priceNonNegative),
      }),
    ),
    selectedAddonIds: z.array(z.string().uuid()),
    depositPaid: z.coerce
      .number({ error: msg.invalidDeposit })
      .min(0, msg.depositNonNegative),
    /** Faktisk pris på bookingen; kan være lavere enn estimat (rabatt) eller høyere. */
    agreedTotal: z.coerce
      .number({ error: msg.invalidAgreedPrice })
      .min(0, msg.agreedPriceNonNegative)
      .refine((n) => Number.isFinite(n), { message: msg.invalidAgreedPrice }),
    notes: z.string().max(8000, msg.max8000).optional(),
    /** Valgfri egen referanse / saksnummer (lagres som `booking_reference`). */
    bookingReference: z
      .string()
      .transform((s) => s.trim())
      .pipe(z.string().max(120, msg.referenceMax120)),
  }).superRefine((data, ctx) => {
    const end = data.eventEndDate.trim();
    if (end && end < data.eventDate) {
      ctx.addIssue({
        code: "custom",
        message: msg.endBeforeStart,
        path: ["eventEndDate"],
      });
    }
  });
}

export const newBookingFormFieldsSchema = createNewBookingFormFieldsSchema(
  defaultValidationMessages,
);

export type NewBookingFormInput = z.infer<typeof newBookingFormFieldsSchema>;

/** Redigering av eksisterende booking (sidepanel); dato kan ligge i fortiden. */
export function createBookingDetailFormSchema(msg: ValidationMessages) {
  const phoneWhenPresentSchema = createPhoneWhenPresentSchema(msg);
  const optionalBookingTimeSchema = createOptionalBookingTimeSchema(msg);

  return z
    .object({
      customerName: z
        .string()
        .transform((s) => s.trim())
        .pipe(z.string().min(2, msg.nameMin2).max(200)),
      phone: z
        .string()
        .transform((s) => s.trim())
        .pipe(z.string().min(1, msg.phoneRequired).pipe(phoneWhenPresentSchema)),
      email: z.union([z.literal(""), z.string().email(msg.invalidEmailShort)]),
      address: z
        .string()
        .transform((s) => s.trim())
        .pipe(z.string().max(300, msg.addressMax300)),
      bookingReference: z
        .string()
        .transform((s) => s.trim())
        .pipe(z.string().max(120, msg.referenceMax120)),
      festType: z
        .string()
        .transform((s) => s.trim())
        .pipe(z.string().min(1, msg.festTypeRequired).max(120)),
      eventType: z.enum(NEW_BOOKING_EVENT_TYPES, {
        message: msg.selectBedriftOrPrivat,
      }),
      eventDate: z
        .string()
        .min(1, msg.selectDate)
        .refine((s) => parseBookingDateLocal(s), { message: msg.invalidDate }),
      eventEndDate: z
        .string()
        .transform((s) => s.trim())
        .refine((s) => s === "" || parseBookingDateLocal(s), {
          message: msg.invalidEndDate,
        }),
      eventStartTime: optionalBookingTimeSchema,
      eventEndTime: optionalBookingTimeSchema,
      guestCount: z.coerce
        .number({ error: msg.guestCountRequired })
        .int(msg.guestCountInteger)
        .min(1, msg.guestCountMin1)
        .max(50_000, msg.guestCountTooHigh),
      totalNok: z.coerce
        .number({ error: msg.invalidTotalPrice })
        .min(0, msg.totalPriceNonNegative),
      paidNok: z.coerce
        .number({ error: msg.invalidPayment })
        .min(0, msg.paymentNonNegative),
      paymentStatus: z.enum(BOOKING_PAYMENT_STATUS_VALUES),
      paymentDueDate: z
        .string()
        .transform((s) => s.trim())
        .refine((s) => s === "" || parseBookingDateLocal(s), {
          message: msg.invalidDueDate,
        }),
      notes: z.string().max(8000, msg.max8000).optional(),
    })
    .superRefine((data, ctx) => {
      const end = data.eventEndDate.trim();
      if (end && end < data.eventDate) {
        ctx.addIssue({
          code: "custom",
          message: msg.endBeforeStart,
          path: ["eventEndDate"],
        });
      }
      if (data.paidNok > data.totalNok) {
        ctx.addIssue({
          code: "custom",
          message: msg.paymentExceedsTotal,
          path: ["paidNok"],
        });
      }
    });
}

export const bookingDetailEditSchema = createBookingDetailFormSchema(
  defaultValidationMessages,
);

export type BookingDetailEditInput = z.infer<typeof bookingDetailEditSchema>;

export function createNewBookingFormSchema(
  msg: ValidationMessages,
  addonCatalog: BookingAddonCatalogEntry[],
  packageCatalog: BookingPackageCatalogEntry[],
) {
  const allowedAddons = new Set(addonCatalog.map((a) => a.id));
  const allowedPackages = new Set(packageCatalog.map((p) => p.id));
  return createNewBookingFormFieldsSchema(msg).superRefine((data, ctx) => {
    if (data.packageSource === "catalog") {
      if (packageCatalog.length === 0) {
        ctx.addIssue({
          code: "custom",
          message: msg.noActivePackages,
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
          message: msg.selectPackage,
          path: ["selectedPackageId"],
        });
        return;
      }
    } else if (data.packageSource === "custom") {
      if (data.customPackageName.trim().length < 1) {
        ctx.addIssue({
          code: "custom",
          message: msg.packageNameRequired,
          path: ["customPackageName"],
        });
      }
    }

    if (data.festType === NEW_BOOKING_FEST_TYPE_ANNET) {
      const t = data.festTypeCustom?.trim() ?? "";
      if (!t) {
        ctx.addIssue({
          code: "custom",
          message: msg.describeType,
          path: ["festTypeCustom"],
        });
      }
    }
    for (const id of data.selectedAddonIds) {
      if (!allowedAddons.has(id)) {
        ctx.addIssue({
          code: "custom",
          message: msg.invalidAddon,
          path: ["selectedAddonIds"],
        });
        return;
      }
    }
    if (data.depositPaid > data.agreedTotal) {
      ctx.addIssue({
        code: "custom",
        message: msg.depositExceedsTotal,
        path: ["depositPaid"],
      });
    }
  });
}

function createPricingCatalogFormFields(msg: ValidationMessages) {
  return {
    name: z.string().min(1, msg.nameRequired),
    description: z.string().optional(),
    price: z.coerce.number().min(0, msg.priceNonNegative),
    active: z.boolean(),
  };
}

export function createPackageFormSchema(msg: ValidationMessages) {
  return z.object(createPricingCatalogFormFields(msg));
}

export const pricingPackageFormSchema = createPackageFormSchema(
  defaultValidationMessages,
);

export function createPricingServiceFormSchema(msg: ValidationMessages) {
  return z.object(createPricingCatalogFormFields(msg));
}

export const pricingServiceFormSchema = createPricingServiceFormSchema(
  defaultValidationMessages,
);

export type PricingPackageFormInput = z.infer<typeof pricingPackageFormSchema>;
export type PricingServiceFormInput = z.infer<typeof pricingServiceFormSchema>;

export function createFinanceTransactionFormSchema(msg: ValidationMessages) {
  return z.object({
    propertyId: z.string().min(1, msg.selectProperty).uuid(msg.invalidProperty),
    type: z.enum(["income", "expense"]),
    category: z.string().min(1, msg.categoryRequired),
    description: z.string().optional(),
    amount: z.coerce.number().positive(msg.amountPositive),
    transactionDate: z.string().min(1, msg.selectDate),
  });
}

export const transactionFormSchema = createFinanceTransactionFormSchema(
  defaultValidationMessages,
);

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

export function createBookingInquiryFormSchema(msg: ValidationMessages) {
  return z
    .object({
      customerId: z.union([z.literal(""), z.string().uuid(msg.invalidCustomer)]),
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
        z.string().email(msg.invalidEmailShort),
      ]),
      newCustomerAddress: z
        .string()
        .transform((s) => s.trim())
        .pipe(z.string().max(300)),
      propertyId: z.union([z.literal(""), z.string().uuid(msg.invalidProperty)]),
      eventType: z.enum(NEW_BOOKING_EVENT_TYPES, {
        message: msg.selectBusinessOrPrivate,
      }),
      festType: z
        .string()
        .transform((s) => s.trim())
        .pipe(z.string().max(120)),
      preferredEventDate: z
        .string()
        .transform((s) => s.trim())
        .refine((s) => s === "" || parseBookingDateLocal(s), {
          message: msg.invalidPreferredDate,
        }),
      preferredEventEndDate: z
        .string()
        .transform((s) => s.trim())
        .refine((s) => s === "" || parseBookingDateLocal(s), {
          message: msg.invalidEndDate,
        }),
      guestCount: z.coerce
        .number({ error: msg.guestCountRequired })
        .int(msg.guestCountInteger)
        .min(0, msg.guestCountMin0)
        .max(50_000, msg.guestCountTooHigh),
      estimatedTotal: z.preprocess((v) => {
        if (v === "" || v === undefined || v === null) return undefined;
        const n = typeof v === "number" ? v : Number(v);
        return Number.isFinite(n) ? n : undefined;
      }, z.number().min(0, msg.amountNonNegative).optional()),
      status: z.enum(BOOKING_INQUIRY_FORM_STATUSES, {
        message: msg.selectStatus,
      }),
      nextFollowUpAt: z
        .string()
        .transform((s) => s.trim())
        .refine((s) => s === "" || !Number.isNaN(Date.parse(s)), {
          message: msg.invalidFollowUpTime,
        }),
      internalNotes: z.string().max(8000, msg.max8000).optional(),
    })
    .superRefine((data, ctx) => {
      if (!data.customerId) {
        if (data.newCustomerName.length < 2) {
          ctx.addIssue({
            code: "custom",
            message: msg.newCustomerNameRequired,
            path: ["newCustomerName"],
          });
        }
        if (data.newCustomerPhone.length < 3) {
          ctx.addIssue({
            code: "custom",
            message: msg.newCustomerPhoneRequired,
            path: ["newCustomerPhone"],
          });
        }
      }
      const start = data.preferredEventDate;
      const end = data.preferredEventEndDate;
      if (start && end && end < start) {
        ctx.addIssue({
          code: "custom",
          message: msg.endBeforeStart,
          path: ["preferredEventEndDate"],
        });
      }
    });
}

export const bookingInquiryFormSchema = createBookingInquiryFormSchema(
  defaultValidationMessages,
);

export type BookingInquiryFormInput = z.infer<typeof bookingInquiryFormSchema>;

// --- Inbound inquiry (public website → CRM via POST /api/inbound/inquiries)
// Kept independent of the internal form schema so front-end i18n messages and
// UX-only fields (customerId picker, form-only statuses) don't leak into the
// external contract. Never expose validation messages here — return generic
// errors from the route handler instead.
const trimmedString = (max: number) =>
  z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().max(max));

const optionalTrimmedString = (max: number) =>
  z
    .string()
    .optional()
    .transform((value) => (value ?? "").trim())
    .pipe(z.string().max(max));

const optionalIsoDate = z
  .string()
  .optional()
  .transform((value) => (value ?? "").trim())
  .refine(
    (value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value),
    "invalid_date_format",
  );

export const inboundInquirySchema = z.object({
  organizationSlug: z
    .string()
    .transform((value) => value.trim().toLowerCase())
    .pipe(
      z
        .string()
        .min(1)
        .max(64)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "invalid_slug"),
    ),
  source: optionalTrimmedString(200),
  customer: z.object({
    name: trimmedString(200).refine((value) => value.length >= 2, "name_required"),
    phone: trimmedString(40).refine((value) => value.length >= 3, "phone_required"),
    email: z
      .string()
      .optional()
      .transform((value) => (value ?? "").trim())
      .refine(
        (value) => value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        "invalid_email",
      ),
    address: optionalTrimmedString(300),
  }),
  inquiry: z
    .object({
      eventType: z.enum(NEW_BOOKING_EVENT_TYPES).default("Privat"),
      festType: optionalTrimmedString(120),
      preferredEventDate: optionalIsoDate,
      preferredEventEndDate: optionalIsoDate,
      guestCount: z.coerce
        .number()
        .int()
        .min(0)
        .max(50_000)
        .default(0),
    })
    .optional()
    .transform((value) =>
      value ?? {
        eventType: "Privat" as const,
        festType: "",
        preferredEventDate: "",
        preferredEventEndDate: "",
        guestCount: 0,
      },
    ),
  message: optionalTrimmedString(8000),
});

export type InboundInquiryInput = z.infer<typeof inboundInquirySchema>;

export function createSupportMessageSchema(msg: ValidationMessages) {
  return z.object({
    body: z
      .string()
      .transform((s) => s.trim())
      .pipe(z.string().min(1, msg.writeMessage).max(8000, msg.max8000)),
  });
}

export const supportMessageSchema = createSupportMessageSchema(
  defaultValidationMessages,
);

export const inquiryActivityNoteSchema = supportMessageSchema;

export type InquiryActivityNoteInput = z.infer<typeof inquiryActivityNoteSchema>;

// --- Overnatting
export const ACCOMMODATION_RESERVATION_STATUSES = [
  "tentative",
  "confirmed",
  "cancelled",
] as const;

export type AccommodationReservationStatus =
  (typeof ACCOMMODATION_RESERVATION_STATUSES)[number];

export function createAccommodationReservationFormSchema(msg: ValidationMessages) {
  const accommodationHhMmOptional = createAccommodationHhMmOptional(msg);

  return z
    .object({
      customerId: z.union([z.literal(""), z.string().uuid(msg.invalidCustomer)]),
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
        z.string().email(msg.invalidEmailShort),
      ]),
      newCustomerAddress: z
        .string()
        .transform((s) => s.trim())
        .pipe(z.string().max(300)),
      unitId: z.string().uuid(msg.selectUnit),
      checkInDate: z
        .string()
        .transform((s) => s.trim())
        .refine((s) => parseBookingDateLocal(s), { message: msg.invalidArrivalDate }),
      checkOutDate: z
        .string()
        .transform((s) => s.trim())
        .refine((s) => parseBookingDateLocal(s), { message: msg.invalidDepartureDate }),
      checkInTime: accommodationHhMmOptional,
      checkOutTime: accommodationHhMmOptional,
      guestCount: z.coerce
        .number({ error: msg.guestCountRequired })
        .int(msg.guestCountInteger)
        .min(1, msg.minOneGuest)
        .max(100, msg.guestCountTooHigh),
      status: z.enum(ACCOMMODATION_RESERVATION_STATUSES, {
        message: msg.selectStatus,
      }),
      notes: z.string().max(8000, msg.max8000).optional(),
      totalPrice: z.preprocess((v) => {
        if (v === "" || v === undefined || v === null) return undefined;
        const n = typeof v === "number" ? v : Number(v);
        return Number.isFinite(n) ? n : undefined;
      }, z.number().min(0, msg.amountNonNegative).optional()),
    })
    .superRefine((data, ctx) => {
      if (!data.customerId) {
        if (data.newCustomerName.length < 2) {
          ctx.addIssue({
            code: "custom",
            message: msg.newCustomerNameRequired,
            path: ["newCustomerName"],
          });
        }
        if (data.newCustomerPhone.length < 3) {
          ctx.addIssue({
            code: "custom",
            message: msg.newCustomerPhoneRequired,
            path: ["newCustomerPhone"],
          });
        }
      }
      if (data.checkInDate >= data.checkOutDate) {
        ctx.addIssue({
          code: "custom",
          message: msg.checkoutAfterCheckin,
          path: ["checkOutDate"],
        });
      }
    });
}

export const accommodationReservationFormSchema =
  createAccommodationReservationFormSchema(defaultValidationMessages);

export type AccommodationReservationFormInput = z.infer<
  typeof accommodationReservationFormSchema
>;

export function createAccommodationReservationEditSchema(msg: ValidationMessages) {
  const accommodationHhMmOptional = createAccommodationHhMmOptional(msg);

  return z
    .object({
      unitId: z.string().uuid(msg.selectUnit),
      checkInDate: z
        .string()
        .transform((s) => s.trim())
        .refine((s) => parseBookingDateLocal(s), { message: msg.invalidArrivalDate }),
      checkOutDate: z
        .string()
        .transform((s) => s.trim())
        .refine((s) => parseBookingDateLocal(s), { message: msg.invalidDepartureDate }),
      checkInTime: accommodationHhMmOptional,
      checkOutTime: accommodationHhMmOptional,
      guestCount: z.coerce
        .number({ error: msg.guestCountRequired })
        .int()
        .min(1)
        .max(100),
      status: z.enum(ACCOMMODATION_RESERVATION_STATUSES, {
        message: msg.selectStatus,
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
          message: msg.checkoutAfterCheckin,
          path: ["checkOutDate"],
        });
      }
    });
}

export const accommodationReservationEditSchema =
  createAccommodationReservationEditSchema(defaultValidationMessages);

export type AccommodationReservationEditInput = z.infer<
  typeof accommodationReservationEditSchema
>;

export function createAccommodationUnitFormSchema(msg: ValidationMessages) {
  return z.object({
    name: z
      .string()
      .transform((s) => s.trim())
      .pipe(z.string().min(1, msg.nameRequired).max(200)),
    propertyId: z.union([z.literal(""), z.string().uuid(msg.invalidProperty)]),
    maxGuests: z.coerce
      .number({ error: msg.capacityRequired })
      .int()
      .min(1, msg.min1Guest)
      .max(100, msg.max100),
    notes: z.string().max(2000, msg.max2000).optional(),
    active: z.boolean(),
    sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
  });
}

export const accommodationUnitFormSchema = createAccommodationUnitFormSchema(
  defaultValidationMessages,
);

export type AccommodationUnitFormInput = z.infer<typeof accommodationUnitFormSchema>;

/** Stored DB preset values for asset condition (allowlisted Norwegian). */
export const ASSET_CONDITION_PRESET_VALUES = {
  excellent: "Utmerket",
  good: "God",
  acceptable: "Akseptabel",
  poor: "Dårlig — byttes",
} as const;

/** Stored DB preset values for asset insurance status (allowlisted Norwegian). */
export const ASSET_INSURANCE_PRESET_VALUES = {
  covered: "Forsikret",
  excluded: "Ikke forsikret",
  unknown: "Ukjent",
} as const;
