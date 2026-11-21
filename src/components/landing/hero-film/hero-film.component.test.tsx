import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FILM_SCENE_MS } from "@/components/landing/hero-film/film-clock";
import { HeroFilm } from "@/components/landing/hero-film/hero-film";
import { getDictionary } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";

vi.mock("@/i18n/client", () => ({
  useTranslation: () => ({
    t: createTranslator(getDictionary("nb")),
    locale: "nb",
    formatCurrency: (n: number) => `${n} kr`,
  }),
}));

const steps = getDictionary("nb").landing.heroFilm.steps;

function mockReducedMotion(reduced: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation(() => ({
      matches: reduced,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

describe("HeroFilm", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("starts on the first scene and shows its caption", () => {
    mockReducedMotion(false);
    render(<HeroFilm />);
    expect(screen.getByText(steps[0]!.title)).toBeTruthy();
    expect(screen.getByRole("button", { name: steps[0]!.label }).getAttribute("aria-pressed")).toBe("true");
  });

  it("advances by itself through the four scenes and loops back to the first", () => {
    mockReducedMotion(false);
    render(<HeroFilm />);
    for (let i = 1; i < steps.length; i += 1) {
      act(() => {
        vi.advanceTimersByTime(FILM_SCENE_MS);
      });
      expect(screen.getByText(steps[i]!.title)).toBeTruthy();
    }
    act(() => {
      vi.advanceTimersByTime(FILM_SCENE_MS);
    });
    expect(screen.getByText(steps[0]!.title)).toBeTruthy();
  });

  it("jumps to a scene when its step button is clicked", () => {
    mockReducedMotion(false);
    render(<HeroFilm />);
    act(() => {
      screen.getByRole("button", { name: steps[3]!.label }).click();
    });
    expect(screen.getByText(steps[3]!.title)).toBeTruthy();
  });

  it("stops on pause and continues on play", () => {
    mockReducedMotion(false);
    render(<HeroFilm />);
    const copy = getDictionary("nb").landing.heroFilm;
    act(() => {
      screen.getByRole("button", { name: copy.pause }).click();
    });
    act(() => {
      vi.advanceTimersByTime(FILM_SCENE_MS * 3);
    });
    expect(screen.getByText(steps[0]!.title)).toBeTruthy();
    act(() => {
      screen.getByRole("button", { name: copy.play }).click();
    });
    act(() => {
      vi.advanceTimersByTime(FILM_SCENE_MS);
    });
    expect(screen.getByText(steps[1]!.title)).toBeTruthy();
  });

  it("never advances on its own when the person prefers reduced motion", () => {
    mockReducedMotion(true);
    render(<HeroFilm />);
    act(() => {
      vi.advanceTimersByTime(FILM_SCENE_MS * 4);
    });
    expect(screen.getByText(steps[0]!.title)).toBeTruthy();
  });
});
