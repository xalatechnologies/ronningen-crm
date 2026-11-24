import * as THREE from "three";

import type { DrawEnv } from "@/components/landing/tour-3d/screens/screen-types";
import {
  type Panel,
  buildAtmosphere,
  buildBookingPath,
  buildPanels,
  disposeScene,
  redrawPanel,
} from "@/components/landing/tour-3d/tour-scene-objects";
import { CAMERA_FOV, cameraTargetFor } from "@/components/landing/tour-3d/tour-layout";
import { TOUR_STEP_COUNT, panelForStep, stepForPanel } from "@/components/landing/tour-3d/tour-steps";

export type TourSceneOptions = {
  canvas: HTMLCanvasElement;
  container: HTMLElement;
  env: DrawEnv;
  step: number;
  reducedMotion: boolean;
  /** Called when the visitor clicks a screen (its step) or the empty space (overview). */
  onSelectStep: (step: number) => void;
};

export type TourScene = {
  focus: (step: number) => void;
  setEnv: (env: DrawEnv) => void;
  setReducedMotion: (reduced: boolean) => void;
  /** Runs the render loop only while the stage is on screen and the tab is visible. */
  setActive: (active: boolean) => void;
  dispose: () => void;
};

const FLIGHT_MS = 2100;
const SCREEN_MOMENT_MS = 1700;
/** Wide layouts show the caption over the stage (Tailwind `lg`). */
const CAPTION_OVERLAY_QUERY = "(min-width: 1024px)";

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

type Flight = {
  fromPos: THREE.Vector3;
  fromLook: THREE.Vector3;
  toPos: THREE.Vector3;
  toLook: THREE.Vector3;
  start: number;
  fromU: number;
  toU: number;
};

/** Creates the WebGL scene, or returns null when the browser has no WebGL. */
export function createTourScene(options: TourSceneOptions): TourScene | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: options.canvas, antialias: true, alpha: true });
  } catch {
    return null;
  }
  const { container, onSelectStep } = options;
  let env = options.env;
  let reduced = options.reducedMotion;
  let current = options.step;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 120);

  const panels: Panel[] = buildPanels(scene, env, renderer.capabilities.getMaxAnisotropy());
  const path = buildBookingPath(scene, panels, env.theme.staff.brand);
  const particles = buildAtmosphere(scene, env.theme.staff.brand);
  const meshes = panels.map((p) => p.mesh);

  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  const parallax = new THREE.Vector2();
  const pointer = new THREE.Vector2();
  const ndc = new THREE.Vector2(-9, -9);
  const ray = new THREE.Raycaster();
  const tmp = new THREE.Vector3();
  let flight: Flight | null = null;
  let travelU = 0;
  let hovered = -1;
  let last = performance.now();

  const pathU = (step: number) => {
    const panel = panelForStep(step);
    return panel === null ? travelU : panel / (TOUR_STEP_COUNT - 2);
  };

  function target(step: number) {
    const overlay = window.matchMedia(CAPTION_OVERLAY_QUERY).matches;
    const t = cameraTargetFor(step, camera.aspect, overlay);
    return { pos: new THREE.Vector3(...t.position), look: new THREE.Vector3(...t.lookAt) };
  }

  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const t = target(current);
    if (flight) {
      flight.toPos.copy(t.pos);
      flight.toLook.copy(t.look);
    } else {
      camPos.copy(t.pos);
      camLook.copy(t.look);
    }
  }

  function focus(step: number) {
    current = step;
    const now = performance.now();
    const t = target(step);
    if (reduced) {
      camPos.copy(t.pos);
      camLook.copy(t.look);
      travelU = pathU(step);
      flight = null;
    } else {
      flight = {
        fromPos: camPos.clone(),
        fromLook: camLook.clone(),
        toPos: t.pos,
        toLook: t.look,
        start: now,
        fromU: travelU,
        toU: pathU(step),
      };
    }
    const index = panelForStep(step);
    if (index !== null) {
      const panel = panels[index]!;
      panel.progress = reduced ? 1 : 0;
      panel.animStart = now + FLIGHT_MS * 0.72;
      redrawPanel(panel, index, env);
    }
  }

  function toNdc(event: PointerEvent, out: THREE.Vector2) {
    const r = container.getBoundingClientRect();
    out.set(((event.clientX - r.left) / r.width) * 2 - 1, -((event.clientY - r.top) / r.height) * 2 + 1);
  }
  function hitPanel(): number {
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(meshes)[0];
    return hit ? (hit.object.userData.panelIndex as number) : -1;
  }

  let down: { x: number; y: number } | null = null;
  const onMove = (e: PointerEvent) => {
    toNdc(e, ndc);
    if (e.pointerType === "mouse") pointer.copy(ndc);
  };
  const onLeave = () => {
    pointer.set(0, 0);
    ndc.set(-9, -9);
  };
  const onDown = (e: PointerEvent) => {
    down = { x: e.clientX, y: e.clientY };
    toNdc(e, ndc);
  };
  const onUp = (e: PointerEvent) => {
    const start = down;
    down = null;
    if (!start || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) return;
    if (e.target !== options.canvas) return;
    const panel = hitPanel();
    if (panel >= 0) onSelectStep(stepForPanel(panel));
    else if (current !== 0) onSelectStep(0);
  };
  container.addEventListener("pointermove", onMove);
  container.addEventListener("pointerleave", onLeave);
  container.addEventListener("pointerdown", onDown);
  container.addEventListener("pointerup", onUp);

  function frame(now: number) {
    const dt = Math.min(0.25, (now - last) / 1000);
    last = now;
    const t = now / 1000;

    if (flight) {
      const k = Math.min(1, (now - flight.start) / FLIGHT_MS);
      const e = ease(k);
      camPos.lerpVectors(flight.fromPos, flight.toPos, e);
      camPos.y += Math.sin(Math.PI * e) * 0.45;
      camLook.lerpVectors(flight.fromLook, flight.toLook, e);
      travelU = flight.fromU + (flight.toU - flight.fromU) * e;
      if (k >= 1) flight = null;
    } else if (current === 0 && !reduced) {
      travelU = (travelU + dt * 0.05) % 1;
    }

    const motion = reduced ? 0 : 1;
    parallax.x += (pointer.x * 0.35 * motion - parallax.x) * 0.05;
    parallax.y += (pointer.y * 0.2 * motion - parallax.y) * 0.05;
    camera.position.copy(camPos).add(tmp.set(parallax.x, parallax.y, 0));
    camera.lookAt(camLook);

    hovered = ndc.x > -2 ? hitPanel() : -1;
    container.style.cursor = hovered >= 0 ? "pointer" : "";

    const focused = panelForStep(current);
    // Time-based easing, so dimming takes the same time on slow and fast screens.
    const fadeStep = reduced ? 1 : 1 - Math.exp(-dt * 4);
    panels.forEach((panel, i) => {
      panel.group.position.y = panel.base.y + (reduced ? 0 : Math.sin(t * 0.7 + i * 1.3) * 0.05);
      panel.hover += ((hovered === i ? 1 : 0) - panel.hover) * 0.15;
      panel.group.scale.setScalar(1 + panel.hover * 0.025);
      const fadeTo = focused === null || focused === i ? 1 : 0.22;
      panel.fade += (fadeTo - panel.fade) * fadeStep;
      panel.mesh.material.opacity = panel.fade;
      panel.backing.material.opacity = panel.fade;
      if (panel.progress < 1 && now >= panel.animStart) {
        panel.progress = Math.min(1, (now - panel.animStart) / SCREEN_MOMENT_MS);
        redrawPanel(panel, i, env);
      }
    });
    path.nodes.forEach((node, i) => {
      const s = focused === i ? 1.8 : 1;
      node.scale.lerp(tmp.set(s, s, s), 0.1);
    });
    path.traveller.position.copy(path.curve.getPoint(Math.max(0, Math.min(1, travelU))));
    path.glow.position.copy(path.traveller.position);
    if (!reduced) particles.rotation.y += dt * 0.012;

    renderer.render(scene, camera);
  }

  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();
  const start = target(current);
  camPos.copy(start.pos);
  camLook.copy(start.look);
  travelU = panelForStep(current) === null ? 0 : pathU(current);

  return {
    focus,
    setEnv(next) {
      env = next;
      panels.forEach((panel, i) => redrawPanel(panel, i, env));
    },
    setReducedMotion(next) {
      reduced = next;
    },
    setActive(active) {
      last = performance.now();
      renderer.setAnimationLoop(active ? frame : null);
    },
    dispose() {
      renderer.setAnimationLoop(null);
      observer.disconnect();
      container.removeEventListener("pointermove", onMove);
      container.removeEventListener("pointerleave", onLeave);
      container.removeEventListener("pointerdown", onDown);
      container.removeEventListener("pointerup", onUp);
      container.style.cursor = "";
      disposeScene(scene);
      renderer.dispose();
    },
  };
}
