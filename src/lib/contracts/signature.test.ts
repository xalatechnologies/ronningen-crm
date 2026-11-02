import { describe, expect, it } from "vitest";

import { isSignaturePath, signatureContentType } from "@/lib/contracts/signature";

const ORG = "890ce58d-8e54-4308-b967-e210ec6b2d32";
const FILE = "0b0f4b5e-5d1e-4a3c-9a52-3b8f0c2d7e11";

describe("signature paths", () => {
  it("accepts org/uuid.png and org/uuid.jpg", () => {
    expect(isSignaturePath(`${ORG}/${FILE}.png`)).toBe(true);
    expect(isSignaturePath(`${ORG}/${FILE}.jpg`)).toBe(true);
  });

  it("rejects traversal, other extensions and extra segments", () => {
    expect(isSignaturePath(`../${FILE}.png`)).toBe(false);
    expect(isSignaturePath(`${ORG}/${FILE}.svg`)).toBe(false);
    expect(isSignaturePath(`${ORG}/x/${FILE}.png`)).toBe(false);
    expect(isSignaturePath("")).toBe(false);
  });

  it("maps extensions to content types", () => {
    expect(signatureContentType(`${ORG}/${FILE}.png`)).toBe("image/png");
    expect(signatureContentType(`${ORG}/${FILE}.jpg`)).toBe("image/jpeg");
  });
});
