import { describe, expect, it } from "vitest";

import {
  createLoginSchema,
  createNewBookingFormFieldsSchema,
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

    it("rejects password mismatch", () => {
      const result = schema.safeParse({
        fullName: "Test User",
        email: "test@example.com",
        password: "password1",
        confirmPassword: "password2",
      });
      expect(result.success).toBe(false);
    });

    it("accepts matching passwords", () => {
      const result = schema.safeParse({
        fullName: "Test User",
        email: "test@example.com",
        password: "password1",
        confirmPassword: "password1",
      });
      expect(result.success).toBe(true);
    });

    it("requires full name", () => {
      expect(
        schema.safeParse({
          fullName: "",
          email: "test@example.com",
          password: "password1",
          confirmPassword: "password1",
        }).success,
      ).toBe(false);
    });
  });

  describe("createNewBookingFormFieldsSchema", () => {
    const schema = createNewBookingFormFieldsSchema(msg);
    const venueId = "11111111-1111-4111-8111-111111111111";
    const base = {
      customerName: "Test Customer",
      phone: "99999999",
      email: "",
      address: "",
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
  });
});
