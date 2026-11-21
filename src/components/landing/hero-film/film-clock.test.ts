import { describe, expect, it } from "vitest";

import { nextFilmStep } from "@/components/landing/hero-film/film-clock";

describe("nextFilmStep", () => {
  it("moves to the next step and wraps to the first after the last", () => {
    expect(nextFilmStep(0, 4)).toBe(1);
    expect(nextFilmStep(2, 4)).toBe(3);
    expect(nextFilmStep(3, 4)).toBe(0);
  });

  it("stays at 0 when there are no steps", () => {
    expect(nextFilmStep(0, 0)).toBe(0);
  });
});
