import { describe, expect, it } from "vitest";

import { CAMERA_FOV, PANEL_LAYOUT, cameraTargetFor, fitDistance } from "@/components/landing/tour-3d/tour-layout";

const distance = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);

describe("fitDistance", () => {
  it("moves the camera further back on narrow screens so the width still fits", () => {
    const wide = fitDistance(4, 2, CAMERA_FOV, 16 / 9);
    const narrow = fitDistance(4, 2, CAMERA_FOV, 9 / 16);
    expect(narrow).toBeGreaterThan(wide);
  });

  it("is limited by height when the area is tall", () => {
    const tanHalf = Math.tan((CAMERA_FOV * Math.PI) / 360);
    expect(fitDistance(1, 4, CAMERA_FOV, 2)).toBeCloseTo(2 / tanHalf);
  });
});

describe("cameraTargetFor", () => {
  it("never pulls the overview camera further back than the cap, even on a phone", () => {
    const target = cameraTargetFor(0, 0.4, false);
    expect(target.position[2]).toBeLessThanOrEqual(26);
  });

  it("places the camera in front of the focused screen, looking at it", () => {
    PANEL_LAYOUT.forEach((panel, i) => {
      const target = cameraTargetFor(i + 1, 16 / 9, false);
      const toCamera = [
        target.position[0] - panel.position[0],
        target.position[2] - panel.position[2],
      ];
      const facing = toCamera[0]! * Math.sin(panel.rotationY) + toCamera[1]! * Math.cos(panel.rotationY);
      expect(facing).toBeGreaterThan(0);
      expect(target.lookAt[0]).toBe(panel.position[0]);
    });
  });

  it("moves the screen up when the caption covers the lower left of the stage", () => {
    const plain = cameraTargetFor(1, 16 / 9, false);
    const overlay = cameraTargetFor(1, 16 / 9, true);
    expect(overlay.lookAt[1]).toBeLessThan(plain.lookAt[1]);
    expect(distance(overlay.position, overlay.lookAt)).toBeCloseTo(distance(plain.position, plain.lookAt), 1);
  });
});
