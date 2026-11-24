import * as THREE from "three";

import { withAlpha } from "@/components/landing/tour-3d/screen-palette";
import { SCREEN_DRAWERS } from "@/components/landing/tour-3d/screens";
import type { DrawEnv } from "@/components/landing/tour-3d/screens/screen-types";
import { PANEL_LAYOUT, PATH_Y, type PanelLayout, panelWidth } from "@/components/landing/tour-3d/tour-layout";

export type Panel = {
  layout: PanelLayout;
  group: THREE.Group;
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  backing: THREE.Mesh<THREE.ExtrudeGeometry, THREE.MeshBasicMaterial>;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  base: THREE.Vector3;
  width: number;
  /** Animation progress of the screen's own moment, 0-1. */
  progress: number;
  animStart: number;
  hover: number;
  fade: number;
};

function radialTexture(inner: string, outer: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const g = canvas.getContext("2d")!;
  const gradient = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, inner);
  gradient.addColorStop(1, outer);
  g.fillStyle = gradient;
  g.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function roundedShape(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

export function redrawPanel(panel: Panel, index: number, env: DrawEnv) {
  SCREEN_DRAWERS[index]!(panel.ctx, panel.progress, env);
  panel.texture.needsUpdate = true;
}

/** The five floating screens, each a canvas texture on a plane with a rounded backing, plus a soft shadow. */
export function buildPanels(scene: THREE.Scene, env: DrawEnv, maxAnisotropy: number): Panel[] {
  const { staff, portal } = env.theme;
  const shadowTexture = radialTexture(withAlpha(staff.ink, 0.34), withAlpha(staff.ink, 0));
  return PANEL_LAYOUT.map((layout, index) => {
    const canvas = document.createElement("canvas");
    canvas.width = layout.canvasWidth;
    canvas.height = layout.canvasHeight;
    const ctx = canvas.getContext("2d")!;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = maxAnisotropy;

    const width = panelWidth(layout);
    const group = new THREE.Group();
    group.position.set(...layout.position);
    group.rotation.y = layout.rotationY;
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, layout.height),
      new THREE.MeshBasicMaterial({ map: texture, transparent: true }),
    );
    mesh.userData.panelIndex = index;
    const depth = 0.04;
    const backing = new THREE.Mesh(
      new THREE.ExtrudeGeometry(roundedShape(width + 0.04, layout.height + 0.04, layout.phone ? 0.15 : 0.06), {
        depth,
        bevelEnabled: false,
      }),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(layout.phone ? portal.ink : staff.frame), transparent: true }),
    );
    backing.position.z = -depth - 0.004;
    group.add(backing, mesh);
    scene.add(group);

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(width * 1.05, 0.9),
      new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(layout.position[0], PATH_Y - 0.03, layout.position[2]);
    scene.add(shadow);

    const panel: Panel = {
      layout,
      group,
      mesh,
      backing,
      ctx,
      texture,
      base: new THREE.Vector3(...layout.position),
      width,
      progress: 1,
      animStart: 0,
      hover: 0,
      fade: 1,
    };
    redrawPanel(panel, index, env);
    return panel;
  });
}

export type BookingPath = {
  curve: THREE.CatmullRomCurve3;
  nodes: THREE.Mesh[];
  traveller: THREE.Mesh;
  glow: THREE.Sprite;
};

/** The line under the screens that traces the booking, a ring per step and a glowing dot that travels along it. */
export function buildBookingPath(scene: THREE.Scene, panels: Panel[], brand: string): BookingPath {
  const color = new THREE.Color(brand);
  const points = panels.map((p) => new THREE.Vector3(p.base.x, PATH_Y, p.base.z + 0.35));
  const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
  scene.add(
    new THREE.Mesh(
      new THREE.TubeGeometry(curve, 260, 0.014, 8, false),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, depthWrite: false }),
    ),
  );
  const ringGeometry = new THREE.RingGeometry(0.08, 0.12, 40);
  const ringMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, depthWrite: false });
  const stemMaterial = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.35 });
  const nodes = points.map((point, i) => {
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(point);
    scene.add(ring);
    const panel = panels[i]!;
    const bottom = panel.base.y - panel.layout.height / 2 - 0.08;
    const stem = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(point.x, PATH_Y + 0.02, point.z),
      new THREE.Vector3(panel.base.x, bottom, panel.base.z),
    ]);
    scene.add(new THREE.Line(stem, stemMaterial));
    return ring;
  });
  const traveller = new THREE.Mesh(new THREE.SphereGeometry(0.06, 24, 16), new THREE.MeshBasicMaterial({ color }));
  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: radialTexture(withAlpha(brand, 0.9), withAlpha(brand, 0)),
      transparent: true,
      depthWrite: false,
    }),
  );
  glow.scale.setScalar(0.55);
  scene.add(traveller, glow);
  return { curve, nodes, traveller, glow };
}

/** A soft brand glow on the floor and a few drifting dots for depth. */
export function buildAtmosphere(scene: THREE.Scene, brand: string): THREE.Points {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 14),
    new THREE.MeshBasicMaterial({
      map: radialTexture(withAlpha(brand, 0.2), withAlpha(brand, 0)),
      transparent: true,
      depthWrite: false,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(-0.4, PATH_Y - 0.06, -0.3);
  scene.add(floor);

  // Fixed pseudo-random layout so the scene looks the same on every visit.
  const count = 160;
  const positions = new Float32Array(count * 3);
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (rand() - 0.5) * 20;
    positions[i * 3 + 1] = rand() * 6 - 2.4;
    positions[i * 3 + 2] = (rand() - 0.5) * 10 - 1;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const particles = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({ color: new THREE.Color(brand), size: 0.04, transparent: true, opacity: 0.4, depthWrite: false }),
  );
  scene.add(particles);
  return particles;
}

/** Frees every geometry, material and texture in the scene (GPU memory). */
export function disposeScene(scene: THREE.Scene) {
  const textures = new Set<THREE.Texture>();
  scene.traverse((object) => {
    const withGeometry = object as THREE.Mesh;
    withGeometry.geometry?.dispose();
    const material = withGeometry.material;
    const materials = Array.isArray(material) ? material : material ? [material] : [];
    for (const m of materials) {
      const map = (m as THREE.MeshBasicMaterial).map;
      if (map) textures.add(map);
      m.dispose();
    }
  });
  textures.forEach((t) => t.dispose());
}
