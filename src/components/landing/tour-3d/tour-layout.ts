import { panelForStep } from "@/components/landing/tour-3d/tour-steps";

/**
 * Where the five screens float and where the camera goes for each step. Plain numbers (no three.js),
 * so the camera framing can be unit tested.
 */

export type Vec3 = readonly [number, number, number];

export type PanelLayout = {
  position: Vec3;
  rotationY: number;
  /** Height in scene units; width follows the canvas aspect ratio. */
  height: number;
  canvasWidth: number;
  canvasHeight: number;
  phone: boolean;
};

const DESKTOP = { height: 2.0, canvasWidth: 1600, canvasHeight: 1000, phone: false } as const;
const PHONE = { height: 2.3, canvasWidth: 780, canvasHeight: 1600, phone: true } as const;

/** Inquiries, calendar, invoices, dashboard, customer portal: left to right, like the booking's journey. */
export const PANEL_LAYOUT: readonly PanelLayout[] = [
  { ...DESKTOP, position: [-5.5, 0.7, -1.0], rotationY: 0.38 },
  { ...DESKTOP, position: [-2.7, -0.85, 0.5], rotationY: 0.16 },
  { ...DESKTOP, position: [0.3, 0.95, -0.5], rotationY: -0.04 },
  { ...DESKTOP, position: [3.1, -0.55, -1.4], rotationY: -0.26 },
  { ...PHONE, position: [5.7, 0.35, 0.5], rotationY: -0.42 },
];

/** Height of the line under the screens that traces the booking. */
export const PATH_Y = -2.3;
export const CAMERA_FOV = 38;

const OVERVIEW_CENTER_X = -0.4;
const OVERVIEW_WIDTH = 15.2;
const OVERVIEW_HEIGHT = 5.8;
const OVERVIEW_MAX_DISTANCE = 26;

export function panelWidth(panel: PanelLayout): number {
  return (panel.height * panel.canvasWidth) / panel.canvasHeight;
}

/** Camera distance at which a width x height area just fits in view. */
export function fitDistance(width: number, height: number, fovDeg: number, aspect: number): number {
  const tanHalf = Math.tan((fovDeg * Math.PI) / 360);
  return Math.max(height / 2 / tanHalf, width / 2 / (tanHalf * aspect));
}

export type CameraTarget = { position: Vec3; lookAt: Vec3 };

/**
 * Camera position and look-at point for a step. With `captionOverlay` (wide screens, caption card over the
 * lower left of the stage) the framing moves the screen up so the caption does not cover it.
 */
export function cameraTargetFor(step: number, aspect: number, captionOverlay: boolean): CameraTarget {
  const panelIndex = panelForStep(step);
  const panel = panelIndex === null ? undefined : PANEL_LAYOUT[panelIndex];
  if (!panel) {
    const d = Math.min(OVERVIEW_MAX_DISTANCE, fitDistance(OVERVIEW_WIDTH, OVERVIEW_HEIGHT, CAMERA_FOV, aspect));
    return {
      position: [OVERVIEW_CENTER_X, 1.2 + d * 0.08, d],
      lookAt: [OVERVIEW_CENTER_X, -0.35, -0.3],
    };
  }
  const [x, y, z] = panel.position;
  const d = fitDistance(panelWidth(panel) * 1.16, panel.height * 1.3, CAMERA_FOV, aspect);
  const shift = captionOverlay ? -0.24 * (panel.height / 2) : 0;
  const nx = Math.sin(panel.rotationY);
  const nz = Math.cos(panel.rotationY);
  return {
    position: [x + nx * d, y + shift + 0.1, z + nz * d],
    lookAt: [x, y + shift, z],
  };
}
