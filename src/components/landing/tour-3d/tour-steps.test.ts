import { describe, expect, it } from "vitest";

import {
  TOUR_OVERVIEW_MS,
  TOUR_SCREEN_MS,
  TOUR_STEP_COUNT,
  nextTourStep,
  panelForStep,
  previousTourStep,
  stepForPanel,
  tourStepDuration,
} from "@/components/landing/tour-3d/tour-steps";
import { PANEL_LAYOUT } from "@/components/landing/tour-3d/tour-layout";
import { getDictionary } from "@/i18n/dictionaries";

describe("tour steps", () => {
  it("has one overview step plus one step per screen", () => {
    expect(TOUR_STEP_COUNT).toBe(PANEL_LAYOUT.length + 1);
  });

  it("wraps forward from the last step to the overview and backward from the overview to the last step", () => {
    expect(nextTourStep(TOUR_STEP_COUNT - 1)).toBe(0);
    expect(nextTourStep(2)).toBe(3);
    expect(previousTourStep(0)).toBe(TOUR_STEP_COUNT - 1);
    expect(previousTourStep(3)).toBe(2);
  });

  it("stays shorter on the overview than on a screen", () => {
    expect(tourStepDuration(0)).toBe(TOUR_OVERVIEW_MS);
    expect(tourStepDuration(4)).toBe(TOUR_SCREEN_MS);
  });

  it("maps steps to panels and back", () => {
    expect(panelForStep(0)).toBeNull();
    expect(panelForStep(1)).toBe(0);
    expect(panelForStep(TOUR_STEP_COUNT)).toBeNull();
    expect(stepForPanel(4)).toBe(5);
  });

  it("has a caption for every step in both languages", () => {
    expect(getDictionary("nb").landing.tour3d.steps).toHaveLength(TOUR_STEP_COUNT);
    expect(getDictionary("en").landing.tour3d.steps).toHaveLength(TOUR_STEP_COUNT);
  });
});
