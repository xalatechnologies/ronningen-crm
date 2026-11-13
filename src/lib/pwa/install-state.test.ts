import { describe, expect, it } from "vitest";

import { decideInstall, installMenuAvailable, isIosDevice, isSamsungBrowser, MAX_DISMISSALS } from "./install-state";

const DAY = 86_400_000;
const base = { standalone: false, isIos: false, hasPrompt: true, coarsePointer: true, stored: {}, now: 1_000 * DAY };

describe("decideInstall", () => {
  it("offers the native prompt on a phone when the browser says it is installable", () => {
    expect(decideInstall(base)).toBe("install-button");
  });
  it("never asks inside the installed app or when known installed", () => {
    expect(decideInstall({ ...base, standalone: true })).toBe("none");
    expect(decideInstall({ ...base, stored: { installed: true } })).toBe("none");
  });
  it("stays quiet for 14 days after Ikke nå, then asks again", () => {
    expect(decideInstall({ ...base, stored: { dismissals: 1, dismissedAt: base.now - 13 * DAY } })).toBe("none");
    expect(decideInstall({ ...base, stored: { dismissals: 1, dismissedAt: base.now - 15 * DAY } })).toBe("install-button");
  });
  it("stops after three dismissals", () => {
    expect(decideInstall({ ...base, stored: { dismissals: MAX_DISMISSALS, dismissedAt: base.now - 365 * DAY } })).toBe("none");
  });
  it("shows the instructions on iPhone (no install event), with a 90-day cooldown", () => {
    const ios = { ...base, isIos: true, hasPrompt: false };
    expect(decideInstall(ios)).toBe("ios-instructions");
    expect(decideInstall({ ...ios, stored: { dismissals: 1, dismissedAt: base.now - 60 * DAY } })).toBe("none");
    expect(decideInstall({ ...ios, stored: { dismissals: 1, dismissedAt: base.now - 91 * DAY } })).toBe("ios-instructions");
  });
  it("does not prompt on desktop pointers or when nothing can be installed", () => {
    expect(decideInstall({ ...base, coarsePointer: false })).toBe("none");
    expect(decideInstall({ ...base, hasPrompt: false })).toBe("none");
  });
});

describe("Samsung Internet", () => {
  it("points to Chrome instead of installing, and still respects cooldown and installed state", () => {
    expect(decideInstall({ ...base, samsung: true })).toBe("chrome-hint");
    expect(decideInstall({ ...base, samsung: true, stored: { installed: true } })).toBe("none");
    expect(decideInstall({ ...base, samsung: true, stored: { dismissals: 1, dismissedAt: base.now - DAY } })).toBe("none");
    expect(decideInstall({ ...base, samsung: false })).toBe("install-button");
  });
  it("is recognised from the user agent", () => {
    expect(isSamsungBrowser({ userAgent: "Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 SamsungBrowser/25.0 Chrome/121.0 Mobile Safari/537.36" })).toBe(true);
    expect(isSamsungBrowser({ userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/121.0 Mobile Safari/537.36" })).toBe(false);
  });
});

describe("installMenuAvailable", () => {
  it("is available when installable, ignoring cooldown, and hidden once installed", () => {
    expect(installMenuAvailable({ standalone: false, isIos: false, hasPrompt: true, stored: { dismissals: 3 } })).toBe(true);
    expect(installMenuAvailable({ standalone: false, isIos: true, hasPrompt: false, stored: {} })).toBe(true);
    expect(installMenuAvailable({ standalone: false, isIos: false, hasPrompt: false, stored: {} })).toBe(false);
    expect(installMenuAvailable({ standalone: true, isIos: true, hasPrompt: true, stored: {} })).toBe(false);
    expect(installMenuAvailable({ standalone: false, isIos: false, hasPrompt: true, stored: { installed: true } })).toBe(false);
  });
});

describe("isIosDevice", () => {
  it("recognises iPhone and iPadOS, not Android", () => {
    expect(isIosDevice({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)", maxTouchPoints: 5 })).toBe(true);
    expect(isIosDevice({ userAgent: "Mozilla/5.0 (Macintosh)", platform: "MacIntel", maxTouchPoints: 5 })).toBe(true);
    expect(isIosDevice({ userAgent: "Mozilla/5.0 (Macintosh)", platform: "MacIntel", maxTouchPoints: 0 })).toBe(false);
    expect(isIosDevice({ userAgent: "Mozilla/5.0 (Linux; Android 14)", maxTouchPoints: 5 })).toBe(false);
  });
});
