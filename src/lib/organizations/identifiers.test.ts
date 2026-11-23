import { describe, expect, it } from "vitest";

import {
  formatBankAccount,
  formatOrgNumber,
  isValidBankAccount,
  isValidOrgNumber,
  isValidPostalCode,
} from "@/lib/organizations/identifiers";

describe("isValidOrgNumber", () => {
  it("accepts a Norwegian organization number with the right check digit, with or without spaces", () => {
    expect(isValidOrgNumber("974760673")).toBe(true);
    expect(isValidOrgNumber("974 760 673")).toBe(true);
  });

  it("rejects a wrong check digit, the wrong length, and letters", () => {
    expect(isValidOrgNumber("974760674")).toBe(false);
    expect(isValidOrgNumber("97476067")).toBe(false);
    expect(isValidOrgNumber("9747606731")).toBe(false);
    expect(isValidOrgNumber("97476067A")).toBe(false);
  });

  it("treats an empty value as valid (the field is optional)", () => {
    expect(isValidOrgNumber("")).toBe(true);
    expect(isValidOrgNumber("   ")).toBe(true);
  });
});

describe("isValidBankAccount", () => {
  it("accepts an 11-digit Norwegian account number with the right check digit, in the usual spellings", () => {
    expect(isValidBankAccount("86011117947")).toBe(true);
    expect(isValidBankAccount("8601.11.17947")).toBe(true);
    expect(isValidBankAccount("8601 11 17947")).toBe(true);
  });

  it("accepts an IBAN-like value", () => {
    expect(isValidBankAccount("NO93 8601 1117 947")).toBe(true);
  });

  it("rejects a wrong check digit, the wrong length, and free text", () => {
    expect(isValidBankAccount("86011117948")).toBe(false);
    expect(isValidBankAccount("8601111794")).toBe(false);
    expect(isValidBankAccount("konto følger")).toBe(false);
  });

  it("treats an empty value as valid", () => {
    expect(isValidBankAccount("")).toBe(true);
  });
});

describe("isValidPostalCode", () => {
  it("needs four digits when present", () => {
    expect(isValidPostalCode("3410")).toBe(true);
    expect(isValidPostalCode("341")).toBe(false);
    expect(isValidPostalCode("34100")).toBe(false);
    expect(isValidPostalCode("34A0")).toBe(false);
    expect(isValidPostalCode("")).toBe(true);
  });
});

describe("formatters", () => {
  it("groups the org number as 3-3-3 and leaves anything that is not 9 digits as typed", () => {
    expect(formatOrgNumber("974760673")).toBe("974 760 673");
    expect(formatOrgNumber("974 760 673")).toBe("974 760 673");
    expect(formatOrgNumber("123")).toBe("123");
  });

  it("groups an 11-digit account number as 4-2-5 and leaves anything else as typed", () => {
    expect(formatBankAccount("86011117947")).toBe("8601.11.17947");
    expect(formatBankAccount("8601 11 17947")).toBe("8601.11.17947");
    expect(formatBankAccount("NO93 8601 1117 947")).toBe("NO93 8601 1117 947");
  });
});
