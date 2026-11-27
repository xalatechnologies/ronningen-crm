import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Tour3dSection } from "@/components/landing/tour-3d/tour-3d-section";
import { TOUR_OVERVIEW_MS, TOUR_SCREEN_MS } from "@/components/landing/tour-3d/tour-steps";
import type { TourEngineStatus } from "@/components/landing/tour-3d/use-tour-engine";
import { getDictionary } from "@/i18n/dictionaries";
import { createTranslator } from "@/i18n/translate";

const engine = vi.hoisted(() => ({
  status: "ready" as TourEngineStatus,
  inView: true,
  lastStep: -1,
  onSelectStep: null as ((step: number) => void) | null,
}));

vi.mock("@/components/landing/tour-3d/use-tour-engine", () => ({
  useTourEngine: (options: { step: number; onSelectStep: (step: number) => void }) => {
    engine.lastStep = options.step;
    engine.onSelectStep = options.onSelectStep;
    return { status: engine.status, inView: engine.inView };
  },
}));

vi.mock("@/i18n/client", () => ({
  useTranslation: () => ({ t: createTranslator(getDictionary("nb")), locale: "nb" }),
}));

const copy = getDictionary("nb").landing.tour3d;

function mockReducedMotion(reduced: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation(() => ({ matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
}

const pressed = (label: string) => screen.getByRole("button", { name: new RegExp(label) }).getAttribute("aria-pressed");

describe("Tour3dSection", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    engine.status = "ready";
    engine.inView = true;
    mockReducedMotion(false);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("starts on the overview with its caption and step selected", () => {
    render(<Tour3dSection />);
    expect(screen.getByRole("heading", { level: 2, name: copy.title })).toBeTruthy();
    expect(screen.getAllByText(copy.steps[0]!.title).length).toBeGreaterThan(0);
    expect(pressed(copy.steps[0]!.label)).toBe("true");
    expect(engine.lastStep).toBe(0);
  });

  it("plays through the steps by itself and tells the 3D scene which step to show", () => {
    render(<Tour3dSection />);
    act(() => vi.advanceTimersByTime(TOUR_OVERVIEW_MS));
    expect(screen.getAllByText(copy.steps[1]!.title).length).toBeGreaterThan(0);
    expect(engine.lastStep).toBe(1);
    act(() => vi.advanceTimersByTime(TOUR_SCREEN_MS));
    expect(engine.lastStep).toBe(2);
  });

  it("stops playing when the visitor presses pause", () => {
    render(<Tour3dSection />);
    fireEvent.click(screen.getByRole("button", { name: copy.pause }));
    act(() => vi.advanceTimersByTime(TOUR_OVERVIEW_MS * 3));
    expect(engine.lastStep).toBe(0);
    expect(screen.getByRole("button", { name: copy.play })).toBeTruthy();
  });

  it("jumps to a chosen step and stays there", () => {
    render(<Tour3dSection />);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(copy.steps[3]!.label) }));
    expect(pressed(copy.steps[3]!.label)).toBe("true");
    act(() => vi.advanceTimersByTime(TOUR_SCREEN_MS * 2));
    expect(engine.lastStep).toBe(3);
  });

  it("follows a click on a screen in the 3D scene", () => {
    render(<Tour3dSection />);
    act(() => engine.onSelectStep?.(5));
    expect(screen.getAllByText(copy.steps[5]!.title).length).toBeGreaterThan(0);
  });

  it("moves between steps with the arrow keys and wraps around", () => {
    render(<Tour3dSection />);
    const stage = screen.getByRole("group", { name: copy.stageLabel });
    fireEvent.keyDown(stage, { key: "ArrowLeft" });
    expect(engine.lastStep).toBe(5);
    fireEvent.keyDown(stage, { key: "ArrowRight" });
    expect(engine.lastStep).toBe(0);
  });

  it("never plays by itself with reduced motion, and has no play button", () => {
    mockReducedMotion(true);
    render(<Tour3dSection />);
    act(() => vi.advanceTimersByTime(TOUR_OVERVIEW_MS * 3));
    expect(engine.lastStep).toBe(0);
    expect(screen.queryByRole("button", { name: copy.pause })).toBeNull();
  });

  it("does not play while the section is off screen", () => {
    engine.inView = false;
    render(<Tour3dSection />);
    act(() => vi.advanceTimersByTime(TOUR_OVERVIEW_MS * 2));
    expect(engine.lastStep).toBe(0);
  });

  it("explains the fallback when the browser has no WebGL, and keeps the steps usable", () => {
    engine.status = "unsupported";
    render(<Tour3dSection />);
    expect(screen.getByText(copy.noWebgl)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: new RegExp(copy.steps[2]!.label) }));
    expect(screen.getAllByText(copy.steps[2]!.title).length).toBeGreaterThan(0);
  });
});
