import { describe, expect, it } from "vitest";

import {
  createBookingInquiryFormSchema,
  createLoginSchema,
  createNewBookingFormFieldsSchema,
  createOrganizationProfileFormSchema,
  createRegisterSchema,
  defaultValidationMessages,
  todayLocalYmd,
} from "@/lib/validations";

const msg = defaultValidationMessages;

describe("validations", () => {
  describe("createLoginSchema", () => {
    const schema = createLoginSchema(msg);

    it("accepts valid email and password", () => {
      const result = schema.safeParse({
        email: "User@Example.com",
        password: "password1",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe("user@example.com");
      }
    });

    it("rejects invalid email", () => {
      expect(
        schema.safeParse({ email: "not-an-email", password: "password1" })
          .success,
      ).toBe(false);
    });

    it("rejects short password", () => {
      expect(
        schema.safeParse({ email: "a@b.co", password: "short" }).success,
      ).toBe(false);
    });
  });

  describe("createRegisterSchema", () => {
    const schema = createRegisterSchema(msg);
    const valid = {
      fullName: "Test User",
      email: "test@example.com",
      password: "password1",
      confirmPassword: "password1",
      acceptTerms: true as const,
      acceptPrivacy: true as const,
      acceptDpa: true as const,
    };

    it("rejects password mismatch", () => {
      expect(schema.safeParse({ ...valid, confirmPassword: "password2" }).success).toBe(false);
    });

    it("accepts matching passwords with every agreement accepted", () => {
      expect(schema.safeParse(valid).success).toBe(true);
    });

    it("requires full name", () => {
      expect(schema.safeParse({ ...valid, fullName: "" }).success).toBe(false);
    });

    it.each(["acceptTerms", "acceptPrivacy", "acceptDpa"])("rejects a missing or unticked %s", (field) => {
      expect(schema.safeParse({ ...valid, [field]: false }).success).toBe(false);
      const { [field as keyof typeof valid]: _omitted, ...rest } = valid;
      void _omitted;
      expect(schema.safeParse(rest).success).toBe(false);
    });
  });

  describe("createNewBookingFormFieldsSchema", () => {
    const schema = createNewBookingFormFieldsSchema(msg);
    const venueId = "11111111-1111-4111-8111-111111111111";
    const base = {
      customerName: "Test Customer",
      phone: "99999999",
      email: "kunde@example.com",
      address: "Storgata 1, 0182 Oslo",
      festType: "Bryllup",
      eventType: "Privat" as const,
      eventDate: todayLocalYmd(),
      eventEndDate: "",
      eventStartTime: "",
      eventEndTime: "",
      guestCount: 10,
      packageSource: "custom" as const,
      selectedPackageId: "",
      customPackageName: "Custom",
      customPackagePrice: 1000,
      customPackageFeatures: [],
      customAddonLines: [],
      selectedAddonIds: [],
      depositPaid: 0,
      agreedTotal: 1000,
      bookingReference: "",
      propertyId: venueId,
    };

    it("requires a venue", () => {
      expect(schema.safeParse({ ...base, propertyId: "" }).success).toBe(false);
    });

    it("accepts a venue uuid", () => {
      expect(schema.safeParse(base).success).toBe(true);
    });

    it("requires email and address", () => {
      expect(schema.safeParse({ ...base, email: "" }).success).toBe(false);
      expect(schema.safeParse({ ...base, address: "ab" }).success).toBe(false);
    });
  });

  describe("createBookingInquiryFormSchema", () => {
    const schema = createBookingInquiryFormSchema(msg);
    const venueId = "11111111-1111-4111-8111-111111111111";
    const packageId = "22222222-2222-4222-8222-222222222222";
    const base = {
      customerId: "",
      newCustomerName: "Test Customer",
      newCustomerPhone: "99999999",
      newCustomerEmail: "kunde@example.com",
      newCustomerAddress: "Storgata 1, 0182 Oslo",
      propertyId: venueId,
      eventType: "Privat" as const,
      festType: "",
      preferredEventDate: todayLocalYmd(),
      preferredEventEndDate: "",
      guestCount: 10,
      estimatedTotal: undefined,
      packageSource: "catalog" as const,
      selectedPackageId: packageId,
      customPackageName: "",
      customPackagePrice: 0,
      customPackageFeatures: [],
      customAddonLines: [],
      selectedAddonIds: [],
      status: "new" as const,
      nextFollowUpAt: "",
      internalNotes: "",
    };

    it("accepts a complete inquiry", () => {
      expect(schema.safeParse(base).success).toBe(true);
    });

    it("requires venue, date, email, address, package, and guests", () => {
      expect(schema.safeParse({ ...base, propertyId: "" }).success).toBe(false);
      expect(schema.safeParse({ ...base, preferredEventDate: "" }).success).toBe(
        false,
      );
      expect(schema.safeParse({ ...base, newCustomerEmail: "" }).success).toBe(
        false,
      );
      expect(schema.safeParse({ ...base, newCustomerAddress: "" }).success).toBe(
        false,
      );
      expect(schema.safeParse({ ...base, selectedPackageId: "" }).success).toBe(
        false,
      );
      expect(schema.safeParse({ ...base, guestCount: 0 }).success).toBe(false);
    });

    it("requires contact details even when an existing customer is selected", () => {
      expect(
        schema.safeParse({
          ...base,
          customerId: "33333333-3333-4333-8333-333333333333",
          newCustomerName: "",
          newCustomerPhone: "",
          newCustomerEmail: "",
          newCustomerAddress: "",
        }).success,
      ).toBe(false);
    });
  });

  describe("createOrganizationProfileFormSchema", () => {
    const schema = createOrganizationProfileFormSchema(msg);
    const empty = {
      name: "Rønningen Selskapslokale",
      legalName: "",
      tagline: "",
      orgNumber: "",
      addressLine1: "",
      addressLine2: "",
      postalCode: "",
      city: "",
      contactEmail: "",
      contactPhone: "",
      logoUrl: "",
      bankAccount: "",
      paymentInstructions: "",
    };
    const fieldsWithErrors = (input: object) => {
      const result = schema.safeParse({ ...empty, ...input });
      return result.success ? [] : [...new Set(result.error.issues.map((i) => String(i.path[0])))];
    };

    it("accepts a profile with only a name and a fully filled profile", () => {
      expect(schema.safeParse(empty).success).toBe(true);
      expect(
        schema.safeParse({
          ...empty,
          legalName: "Eksempel AS",
          orgNumber: "974 760 673",
          addressLine1: "Gata 1",
          postalCode: "3410",
          city: "Sylling",
          contactEmail: "post@eksempel.no",
          contactPhone: "+47 929 77 771",
          logoUrl: "https://eksempel.no/logo.png",
          bankAccount: "8601.11.17947",
        }).success,
      ).toBe(true);
    });

    it("trims the name and needs at least two characters", () => {
      const ok = schema.safeParse({ ...empty, name: "  Lokalet  " });
      expect(ok.success && ok.data.name).toBe("Lokalet");
      expect(fieldsWithErrors({ name: " a " })).toEqual(["name"]);
    });

    it("rejects an org number, bank account and postal code that fail their checks", () => {
      expect(fieldsWithErrors({ orgNumber: "974760674" })).toEqual(["orgNumber"]);
      expect(fieldsWithErrors({ bankAccount: "86011117948" })).toEqual(["bankAccount"]);
      expect(fieldsWithErrors({ postalCode: "341" })).toEqual(["postalCode"]);
    });

    it("rejects a malformed email and phone number", () => {
      expect(fieldsWithErrors({ contactEmail: "ikke-en-epost" })).toEqual(["contactEmail"]);
      expect(fieldsWithErrors({ contactPhone: "12" })).toEqual(["contactPhone"]);
      expect(fieldsWithErrors({ contactPhone: "abc defgh ij" })).toContain("contactPhone");
    });

    it("only allows a secure (https) logo address", () => {
      expect(fieldsWithErrors({ logoUrl: "http://eksempel.no/logo.png" })).toEqual(["logoUrl"]);
      expect(fieldsWithErrors({ logoUrl: "javascript:alert(1)" })).toEqual(["logoUrl"]);
      expect(fieldsWithErrors({ logoUrl: "ikke en url" })).toEqual(["logoUrl"]);
    });
  });
});
