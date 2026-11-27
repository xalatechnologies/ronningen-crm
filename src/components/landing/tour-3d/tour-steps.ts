/**
 * Step model for the 3D tour. Step 0 is the overview of all screens; steps 1-5 each focus one screen
 * (panel 0-4), in the order a booking moves through the app.
 */

export const TOUR_STEP_COUNT = 6;

/** How long the tour stays on a step while playing, including the 2.1 s camera flight. */
export const TOUR_OVERVIEW_MS = 6000;
export const TOUR_SCREEN_MS = 7500;

export function nextTourStep(step: number): number {
  return (step + 1) % TOUR_STEP_COUNT;
}

export function previousTourStep(step: number): number {
  return (step - 1 + TOUR_STEP_COUNT) % TOUR_STEP_COUNT;
}

export function tourStepDuration(step: number): number {
  return step === 0 ? TOUR_OVERVIEW_MS : TOUR_SCREEN_MS;
}

/** The screen panel a step focuses, or null for the overview. */
export function panelForStep(step: number): number | null {
  return step > 0 && step < TOUR_STEP_COUNT ? step - 1 : null;
}

export function stepForPanel(panel: number): number {
  return panel + 1;
}
