import { describe, expect, it } from "vitest";

import { readFileSync } from "node:fs";

import { canEmbedSignature, isSignaturePath, signatureContentType, signaturePathBelongsToOrg } from "@/lib/contracts/signature";

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

describe("canEmbedSignature", () => {
  it("accepts a real PNG", async () => {
    const png = new Uint8Array(readFileSync("public/contracts/utleier-signatur.png"));
    expect(await canEmbedSignature(png, "png")).toBe(true);
  });

  it("rejects bytes that only look like a PNG or JPEG", async () => {
    const fakePng = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
    const fakeJpg = new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 3, 4]);
    expect(await canEmbedSignature(fakePng, "png")).toBe(false);
    expect(await canEmbedSignature(fakeJpg, "jpg")).toBe(false);
  });
});

describe("signaturePathBelongsToOrg", () => {
  it("only accepts paths under the organization's own folder", () => {
    expect(signaturePathBelongsToOrg(`${ORG}/${FILE}.png`, ORG)).toBe(true);
    expect(signaturePathBelongsToOrg(`${FILE}/${FILE}.png`, ORG)).toBe(false);
    expect(signaturePathBelongsToOrg(`${ORG}/${FILE}.png`, FILE)).toBe(false);
  });
});
