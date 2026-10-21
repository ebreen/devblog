import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { createCityscape, type Cityscape } from "./cityscape";
import {
  BOOK_COLORS,
  makeArtTexture,
  makeCheckerTexture,
  makeClockTexture,
  makeFloorTexture,
  makeGameTexture,
  makeMarqueeTexture,
  makeMonitorTexture,
  makeNeonTexture,
  makePlasterTexture,
  makeRecordTexture,
  makeResumeTexture,
  makeRugTexture,
  makeTvTexture,
  type ArtVariant
} from "./textures";

/**
 * A one-room flat on the tenth floor above Bjørvika, at night.
 *
 * Axes: -z is the glass wall and the fjord, +z the back wall with the desk,
 * -x the media wall, +x the shelf and the door. The floor is y = 0 and the
 * ceiling sits at y = 3.18.
 */

export type RectCollider = { minX: number; maxX: number; minZ: number; maxZ: number };

export type BlinkingLed = {
  material: THREE.MeshStandardMaterial;
  phase: number;
  speed: number;
};

export type LightRig = {
  ambient: THREE.AmbientLight;
  hemisphere: THREE.HemisphereLight;
  fills: THREE.PointLight[];
  fillIntensities: number[];
  downlight: THREE.MeshStandardMaterial;
};

export type RoomFx = {
  update(time: number, dt: number): void;
  setPointScale(scale: number): void;
};

export type RoomWorld = {
  scene: THREE.Scene;
  colliders: RectCollider[];
  bounds: RectCollider;
  leds: BlinkingLed[];
  printer: { paper: THREE.Mesh; homeZ: number; travelZ: number };
  roomba: THREE.Group;
  record: THREE.Group;
  recordPosition: THREE.Vector3;
  clock: { set(text: string): void };
  laptopScreen: THREE.MeshBasicMaterial;
  cityscape: Cityscape;
  lighting: LightRig;
  fx: RoomFx;
};

const CEILING_Y = 3.18;

const colors = {
  wall: 0xb8afa0,
  ceiling: 0x6c655b,
  trim: 0x8a8172,
  walnut: 0x5e3f27,
  walnutLight: 0x7a5638,
  oak: 0x9c7a55,
  steel: 0x1a1b1e,
  black: 0x121214,
  graphite: 0x2a2b2f,
  leather: 0x8e4a25,
  leatherDark: 0x7a3d1e,
  boucle: 0xe2dbc8,
  cream: 0xe4dcc8,
  linen: 0x8b7f6a,
  leaf: 0x34492f,
  leafLight: 0x4b6a3c,
  accent: 0xd6b45f,
  paper: 0xefece3,
  felt: 0x1f1d1b
};

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

let materialCache = new Map<string, THREE.MeshStandardMaterial>();

function mat(color: number, roughness = 0.85, metalness = 0): THREE.MeshStandardMaterial {
  const key = `${color}:${roughness}:${metalness}`;
  let material = materialCache.get(key);
  if (!material) {
    material = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    materialCache.set(key, material);
  }
  return material;
}

function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function finish<T extends THREE.Mesh>(mesh: T, cast = true, receive = true): T {
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

function box(w: number, h: number, d: number, color: number, roughness = 0.85, metalness = 0): THREE.Mesh {
  return finish(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, roughness, metalness)));
}

function rbox(
  w: number,
  h: number,
  d: number,
  radius: number,
  color: number | THREE.Material,
  roughness = 0.85,
  metalness = 0
): THREE.Mesh {
  const r = Math.min(radius, Math.min(w, h, d) / 2 - 0.0005);
  const material = typeof color === "number" ? mat(color, roughness, metalness) : color;
  return finish(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.max(0.001, r)), material));
}

function cyl(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  color: number,
  segments = 20,
  roughness = 0.85,
  metalness = 0
): THREE.Mesh {
  return finish(
    new THREE.Mesh(
      new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments),
      mat(color, roughness, metalness)
    )
  );
}

function lathe(profile: Array<[number, number]>, material: THREE.Material, segments = 28): THREE.Mesh {
  const points = profile.map(([r, y]) => new THREE.Vector2(r, y));
  return finish(new THREE.Mesh(new THREE.LatheGeometry(points, segments), material));
}

function ledMesh(size: number, leds: BlinkingLed[], random: () => number, color = colors.accent): THREE.Mesh {
  const material = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: color, emissiveIntensity: 1 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size / 2), material);
  leds.push({ material, phase: random() * Math.PI * 2, speed: 1.5 + random() * 4 });
  return mesh;
}

function glow(color: number, intensity = 1.6): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: 0x1a120a, emissive: color, emissiveIntensity: intensity, roughness: 0.6 });
}

function pointLight(color: number, intensity: number, distance: number, x: number, y: number, z: number): THREE.PointLight {
  const light = new THREE.PointLight(color, intensity, distance, 2);
  light.position.set(x, y, z);
  return light;
}

/** A soft pointed leaf, pivot at the stem end, pointing along +y. */
function leafGeometry(width = 0.36, tip = 1): THREE.ShapeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(width, 0.18 * tip, width * 0.95, 0.72 * tip, 0, tip);
  shape.bezierCurveTo(-width * 0.95, 0.72 * tip, -width, 0.18 * tip, 0, 0);
  const geometry = new THREE.ShapeGeometry(shape, 6);
  // Give the blade a gentle fold along its midrib.
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    position.setZ(i, Math.abs(x) * 0.35 - y * y * 0.08);
  }
  geometry.computeVertexNormals();
  return geometry;
}

type LeafPlacement = { position: THREE.Vector3; rotation: THREE.Euler; scale: number; tint: number };

function leafCluster(placements: LeafPlacement[], geometry: THREE.BufferGeometry, base: number): THREE.InstancedMesh {
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.62, side: THREE.DoubleSide });
  const mesh = new THREE.InstancedMesh(geometry, material, placements.length);
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const color = new THREE.Color();
  placements.forEach((leaf, index) => {
    quaternion.setFromEuler(leaf.rotation);
    scale.setScalar(leaf.scale);
    matrix.compose(leaf.position, quaternion, scale);
    mesh.setMatrixAt(index, matrix);
    color.setHex(base).offsetHSL(0, 0, leaf.tint);
    mesh.setColorAt(index, color);
  });
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/* ------------------------------------------------------------------ */
/* Shell                                                                */
/* ------------------------------------------------------------------ */

function buildShell(scene: THREE.Scene, cityscape: Cityscape, random: () => number): void {
  const floor = finish(
    new THREE.Mesh(
      new THREE.BoxGeometry(8.4, 0.2, 7.4),
      new THREE.MeshStandardMaterial({ map: makeFloorTexture(), roughness: 0.48, metalness: 0 })
    ),
    false,
    true
  );
  floor.position.y = -0.1;
  scene.add(floor);

  const plaster = makePlasterTexture();
  const wallMaterial = new THREE.MeshStandardMaterial({ color: colors.wall, map: plaster, roughness: 0.95 });
  const ceilingMaterial = new THREE.MeshStandardMaterial({ color: colors.ceiling, map: plaster, roughness: 0.97 });

  for (const side of [-1, 1]) {
    const wall = finish(new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.42, 7.4), wallMaterial), false, true);
    wall.position.set(side * 4.1, 1.71, 0);
    scene.add(wall);
    const baseboard = box(0.03, 0.12, 7.0, colors.trim, 0.7);
    baseboard.position.set(side * 3.985, 0.06, 0);
    scene.add(baseboard);
  }

  const backWall = finish(new THREE.Mesh(new THREE.BoxGeometry(8.4, 3.42, 0.2), wallMaterial), false, true);
  backWall.position.set(0, 1.71, 3.6);
  scene.add(backWall);
  const backBaseboard = box(4.2, 0.12, 0.03, colors.trim, 0.7);
  backBaseboard.position.set(1.95, 0.06, 3.485);
  scene.add(backBaseboard);

  const ceiling = finish(new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.24, 7.62), ceilingMaterial), false, true);
  ceiling.position.set(0, CEILING_Y + 0.12, 0.06);
  scene.add(ceiling);

  // Glass wall: black steel frame, a low rail, a deep head.
  const steel = mat(colors.black, 0.45, 0.6);
  const sill = finish(new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.08, 0.2), steel));
  sill.position.set(0, 0.04, -3.56);
  const head = box(8.4, 0.3, 0.5, 0x2b2722, 0.9);
  head.position.set(0, CEILING_Y - 0.13, -3.42);
  const rail = finish(new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.05, 0.06), steel));
  rail.position.set(0, 0.62, -3.56);
  scene.add(sill, head, rail);
  for (let i = 0; i <= 4; i += 1) {
    const mullion = finish(new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.9, 0.12), steel));
    mullion.position.set(-4.2 + i * 2.1, 1.5, -3.56);
    scene.add(mullion);
  }
  const pane = new THREE.Mesh(
    new THREE.PlaneGeometry(8.2, 2.92),
    new THREE.MeshPhysicalMaterial({
      color: 0x9fb2d0,
      transparent: true,
      opacity: 0.06,
      roughness: 0.05,
      metalness: 0,
      depthWrite: false
    })
  );
  pane.position.set(0, 1.5, -3.53);
  scene.add(pane);

  // A string of warm bulbs sagging along the top of the glass.
  const bulbMaterial = glow(0xffc070, 2.2);
  const bulbGeometry = new THREE.SphereGeometry(0.02, 8, 8);
  for (let i = 0; i < 26; i += 1) {
    const t = i / 25;
    const x = -3.9 + t * 7.8;
    const sag = Math.abs(Math.sin(t * Math.PI * 3)) * 0.1;
    const bulb = new THREE.Mesh(bulbGeometry, bulbMaterial);
    bulb.position.set(x, 2.88 - sag, -3.46);
    scene.add(bulb);
  }

  // Linen curtains gathered at both ends, folds baked into the geometry.
  for (const side of [-1, 1]) {
    const geometry = new THREE.PlaneGeometry(0.7, 2.96, 36, 1);
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i += 1) {
      const x = position.getX(i);
      position.setZ(i, Math.sin((x + 0.35) * Math.PI * 9) * 0.06 + Math.sin((x + 0.35) * 23) * 0.012);
    }
    geometry.computeVertexNormals();
    const curtain = finish(
      new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: colors.linen, roughness: 1, side: THREE.DoubleSide }))
    );
    curtain.position.set(side * 3.62, 1.5, -3.36);
    scene.add(curtain);
  }
  const curtainRod = cyl(0.012, 0.012, 8.0, colors.black, 8, 0.4, 0.6);
  curtainRod.rotation.z = Math.PI / 2;
  curtainRod.position.set(0, 2.98, -3.36);
  scene.add(curtainRod);

  // Radiator under the glass: a white panel with fins.
  const radiator = rbox(2.0, 0.46, 0.08, 0.01, 0xd8d2c6, 0.7);
  radiator.position.set(-1.0, 0.36, -3.4);
  scene.add(radiator);
  const finGeometry = new THREE.BoxGeometry(0.012, 0.4, 0.1);
  const fins = new THREE.InstancedMesh(finGeometry, mat(0xc4beb2, 0.7), 18);
  const matrix = new THREE.Matrix4();
  for (let i = 0; i < 18; i += 1) {
    matrix.makeTranslation(-1.92 + i * 0.108, 0.36, -3.42);
    fins.setMatrixAt(i, matrix);
  }
  scene.add(fins);

  // Recessed downlights: dark until the wall switch is flipped.
  void random;
  scene.add(cityscape.group);
}

/* ------------------------------------------------------------------ */
/* Walls and art                                                        */
/* ------------------------------------------------------------------ */

function framedPrint(
  w: number,
  h: number,
  variant: ArtVariant,
  frameColor: number = colors.black
): THREE.Group {
  const frame = new THREE.Group();
  const border = rbox(w + 0.06, h + 0.06, 0.03, 0.004, frameColor, 0.6);
  const mount = box(w + 0.01, h + 0.01, 0.005, 0xefe9dc, 1);
  mount.position.z = 0.016;
  const print = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 0.82, h * 0.86),
    new THREE.MeshStandardMaterial({ map: makeArtTexture(variant), roughness: 0.9 })
  );
  print.position.z = 0.02;
  frame.add(border, mount, print);
  return frame;
}

function buildGallery(scene: THREE.Scene): void {
  const left: Array<{ z: number; y: number; w: number; h: number; variant: ArtVariant; frame?: number }> = [
    { z: -2.5, y: 1.72, w: 0.5, h: 0.66, variant: "fjord" },
    { z: -2.05, y: 2.02, w: 0.3, h: 0.4, variant: "grid", frame: colors.walnut },
    { z: -2.38, y: 2.48, w: 0.4, h: 0.48, variant: "moon" },
    { z: -0.05, y: 1.92, w: 0.3, h: 0.4, variant: "moon", frame: colors.walnut },
    { z: 0.02, y: 2.45, w: 0.36, h: 0.46, variant: "grid" }
  ];
  for (const spot of left) {
    const frame = framedPrint(spot.w, spot.h, spot.variant, spot.frame);
    frame.position.set(-3.98, spot.y, spot.z);
    frame.rotation.y = Math.PI / 2;
    scene.add(frame);
  }

  const right = framedPrint(0.46, 0.62, "sun", colors.walnut);
  right.position.set(3.98, 1.95, 0.55);
  right.rotation.y = -Math.PI / 2;
  scene.add(right);
}

/** Vertical walnut slats on dark felt behind the desk and printer. */
function buildSlatWall(scene: THREE.Scene): void {
  const startX = -3.92;
  const endX = -0.2;
  const backing = box(endX - startX, CEILING_Y, 0.02, colors.felt, 1);
  backing.position.set((startX + endX) / 2, CEILING_Y / 2, 3.49);
  backing.castShadow = false;
  scene.add(backing);

  const pitch = 0.062;
  const count = Math.floor((endX - startX) / pitch);
  const slats = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.03, CEILING_Y - 0.02, 0.028),
    mat(colors.walnutLight, 0.7),
    count
  );
  const matrix = new THREE.Matrix4();
  for (let i = 0; i < count; i += 1) {
    matrix.makeTranslation(startX + pitch / 2 + i * pitch, CEILING_Y / 2, 3.466);
    slats.setMatrixAt(i, matrix);
  }
  slats.castShadow = true;
  slats.receiveShadow = true;
  scene.add(slats);
}

/* ------------------------------------------------------------------ */
/* Media wall                                                           */
/* ------------------------------------------------------------------ */

function buildMediaWall(
  scene: THREE.Scene,
  random: () => number
): { record: THREE.Group; recordPosition: THREE.Vector3; clock: { set(text: string): void } } {
  const consoleGroup = new THREE.Group();
  consoleGroup.position.set(-3.7, 0, -1.05);

  const body = rbox(0.44, 0.46, 1.9, 0.015, colors.walnut, 0.62);
  body.position.y = 0.37;
  consoleGroup.add(body);
  // Three fluted doors along the front.
  for (let d = 0; d < 3; d += 1) {
    if (d === 0) {
      continue;
    }
    const door = rbox(0.02, 0.4, 0.6, 0.006, colors.walnutLight, 0.6);
    door.position.set(0.225, 0.37, -0.62 + d * 0.62);
    consoleGroup.add(door);
    const pull = box(0.02, 0.012, 0.08, colors.accent, 0.35, 0.8);
    pull.position.set(0.24, 0.52, -0.62 + d * 0.62 - 0.22);
    consoleGroup.add(pull);
  }
  // Open bay with records on the window end.
  const bay = box(0.02, 0.38, 0.58, 0x1a130c, 1);
  bay.position.set(0.214, 0.37, -0.62);
  consoleGroup.add(bay);
  const sleeveColors = [0xb8402c, 0x2f5f8a, 0xe4dcc8, 0x2f2a24, 0xd6b45f, 0x4f6b4a, 0x6a2e3a];
  for (let i = 0; i < 9; i += 1) {
    const sleeve = box(0.3, 0.31, 0.012, sleeveColors[i % sleeveColors.length], 0.9);
    sleeve.position.set(0.05, 0.33, -0.85 + i * 0.05);
    sleeve.rotation.x = (random() - 0.5) * 0.08;
    consoleGroup.add(sleeve);
  }
  for (const [lz, lx] of [
    [-0.85, 0.15],
    [0.85, 0.15],
    [-0.85, -0.15],
    [0.85, -0.15]
  ]) {
    const leg = cyl(0.018, 0.012, 0.14, colors.walnut, 10);
    leg.position.set(lx, 0.07, lz);
    consoleGroup.add(leg);
  }

  // Record player on the window end of the top.
  const topY = 0.6;
  const player = new THREE.Group();
  player.position.set(0.02, topY, -0.52);
  const plinth = rbox(0.36, 0.08, 0.44, 0.012, colors.walnutLight, 0.55);
  plinth.position.y = 0.04;
  const lid = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.005, 0.44),
    new THREE.MeshPhysicalMaterial({ color: 0xbfc8d8, transparent: true, opacity: 0.08, roughness: 0.1 })
  );
  lid.position.set(-0.16, 0.24, 0);
  lid.rotation.z = -1.25;
  const record = new THREE.Group();
  record.position.set(0, 0.085, 0.03);
  const platter = cyl(0.14, 0.14, 0.012, 0x9a9a9e, 32, 0.35, 0.85);
  const vinyl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 0.004, 40),
    [
      mat(0x0b0b0c, 0.4),
      new THREE.MeshStandardMaterial({ map: makeRecordTexture(), roughness: 0.35 }),
      mat(0x0b0b0c, 0.4)
    ]
  );
  vinyl.position.y = 0.008;
  record.add(platter, vinyl);
  const armBase = cyl(0.018, 0.022, 0.03, 0x9a9a9e, 12, 0.35, 0.85);
  armBase.position.set(0.12, 0.095, -0.15);
  const arm = cyl(0.004, 0.004, 0.22, 0xc9c9cc, 8, 0.3, 0.9);
  arm.rotation.x = Math.PI / 2;
  arm.rotation.z = 0.35;
  arm.position.set(0.085, 0.112, -0.06);
  player.add(plinth, lid, record, armBase, arm);
  consoleGroup.add(player);

  // Little orange globe lamp at the window end.
  const lampBase = cyl(0.04, 0.05, 0.03, colors.black, 14, 0.5, 0.4);
  lampBase.position.set(0.04, topY + 0.015, -0.86);
  const lampGlobe = new THREE.Mesh(new THREE.SphereGeometry(0.08, 20, 16), glow(0xff9c4a, 1.6));
  lampGlobe.position.set(0.04, topY + 0.11, -0.86);
  consoleGroup.add(lampBase, lampGlobe, pointLight(0xff9c4a, 0.9, 2.6, 0.2, topY + 0.16, -0.86));

  // Desk clock with live Oslo time.
  const clockFace = makeClockTexture();
  const clockBody = rbox(0.06, 0.08, 0.17, 0.01, colors.black, 0.5);
  clockBody.position.set(0.06, topY + 0.04, 0.42);
  const clockScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.062), new THREE.MeshBasicMaterial({ map: clockFace.texture }));
  clockScreen.position.set(0.0905, topY + 0.042, 0.42);
  clockScreen.rotation.y = Math.PI / 2;
  consoleGroup.add(clockBody, clockScreen);

  // A trailing pothos spilling off the end.
  const pot = lathe(
    [
      [0, 0],
      [0.06, 0],
      [0.07, 0.1],
      [0.064, 0.1],
      [0, 0.02]
    ],
    mat(0xd9d2c0, 0.6)
  );
  pot.position.set(0.04, topY, 0.78);
  consoleGroup.add(pot);
  const trail: LeafPlacement[] = [];
  for (let s = 0; s < 3; s += 1) {
    const dirZ = s === 0 ? 0.06 : s === 1 ? 0.02 : -0.04;
    for (let i = 0; i < 9; i += 1) {
      const t = i / 8;
      const x = 0.08 + t * 0.18 + (s === 2 ? -0.05 : 0);
      const y = topY + 0.12 - t * t * 0.55;
      trail.push({
        position: new THREE.Vector3(x, y, 0.78 + dirZ * (1 + t * 2)),
        rotation: new THREE.Euler(random() * 1.4 - 0.7, random() * Math.PI * 2, -1.2 - random() * 0.6),
        scale: 0.06 + random() * 0.025,
        tint: random() * 0.08 - 0.03
      });
    }
  }
  consoleGroup.add(leafCluster(trail, leafGeometry(0.42, 1), colors.leafLight));
  scene.add(consoleGroup);

  // Wall-mounted TV, paused, with a soft blue spill.
  const bezel = rbox(0.04, 0.8, 1.38, 0.012, 0x0b0b0d, 0.4);
  bezel.position.set(-3.975, 1.42, -1.05);
  scene.add(bezel);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.32, 0.74), new THREE.MeshBasicMaterial({ map: makeTvTexture() }));
  screen.position.set(-3.952, 1.42, -1.05);
  screen.rotation.y = Math.PI / 2;
  scene.add(screen, pointLight(0x9fc0e8, 0.8, 3.4, -3.4, 1.42, -1.05));

  // Neon: "cozy" above the TV, and the jazz poster leaning in the corner.
  const cozy = new THREE.Mesh(
    new THREE.PlaneGeometry(1.0, 0.375),
    new THREE.MeshBasicMaterial({ map: makeNeonTexture("cozy", "#5ec8ff"), transparent: true, depthWrite: false })
  );
  cozy.position.set(-3.97, 2.36, -1.05);
  cozy.rotation.y = Math.PI / 2;
  scene.add(cozy, pointLight(0x5ec8ff, 0.7, 2.4, -3.7, 2.36, -1.05));

  const poster = new THREE.Group();
  poster.position.set(-3.74, 0.44, -2.72);
  poster.rotation.y = Math.PI / 2;
  poster.rotation.z = 0.13;
  const posterFrame = rbox(0.62, 0.84, 0.04, 0.006, colors.black, 0.6);
  const posterArt = new THREE.Mesh(new THREE.PlaneGeometry(0.56, 0.78), new THREE.MeshBasicMaterial({ map: makeMarqueeTexture() }));
  posterArt.position.z = 0.025;
  poster.add(posterFrame, posterArt);
  scene.add(poster, pointLight(0xffc070, 0.35, 1.2, -3.5, 0.5, -2.7));

  const recordPosition = new THREE.Vector3(-3.68, topY + 0.1, -1.54);
  return { record, recordPosition, clock: { set: clockFace.set } };
}

/* ------------------------------------------------------------------ */
/* Home office                                                          */
/* ------------------------------------------------------------------ */

function buildHomeOffice(scene: THREE.Scene, leds: BlinkingLed[], random: () => number): void {
  const desk = new THREE.Group();
  desk.position.set(-2.4, 0, 3.05);

  const top = rbox(2.2, 0.04, 0.76, 0.012, colors.oak, 0.55);
  top.position.y = 0.74;
  desk.add(top);
  // Black steel sled legs.
  for (const sx of [-1.0, 1.0]) {
    for (const sz of [-0.32, 0.32]) {
      const leg = box(0.035, 0.72, 0.035, colors.black, 0.45, 0.5);
      leg.position.set(sx, 0.36, sz);
      desk.add(leg);
    }
    const foot = box(0.035, 0.035, 0.7, colors.black, 0.45, 0.5);
    foot.position.set(sx, 0.02, 0);
    const brace = box(0.035, 0.035, 0.7, colors.black, 0.45, 0.5);
    brace.position.set(sx, 0.7, 0);
    desk.add(foot, brace);
  }
  const mat2 = rbox(0.9, 0.004, 0.38, 0.002, 0x2b2b2e, 1);
  mat2.position.set(0, 0.762, -0.1);
  desk.add(mat2);

  const screens: Array<{ x: number; angle: number; texture: THREE.CanvasTexture }> = [
    {
      x: -0.42,
      angle: -0.26,
      texture: makeMonitorTexture([
        "$ ls ~/projects",
        "baton/          soon*",
        "modeltable/     live",
        "pixelwitness/   wip",
        "cloudmount/     wip",
        "parrot-windows/",
        "shield-airplay/",
        "$"
      ])
    },
    { x: 0.42, angle: 0.26, texture: makeGameTexture() }
  ];
  for (const config of screens) {
    const monitor = new THREE.Group();
    monitor.position.set(config.x, 0.76, 0.12);
    monitor.rotation.y = Math.PI + config.angle;
    const foot = rbox(0.22, 0.012, 0.16, 0.004, colors.steel, 0.4, 0.6);
    const pole = box(0.03, 0.26, 0.02, colors.steel, 0.4, 0.6);
    pole.position.set(0, 0.14, -0.05);
    const panel = rbox(0.64, 0.38, 0.022, 0.006, colors.black, 0.4);
    panel.position.set(0, 0.36, -0.035);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.345), new THREE.MeshBasicMaterial({ map: config.texture }));
    screen.position.set(0, 0.362, -0.023);
    monitor.add(foot, pole, panel, screen);
    desk.add(monitor);
  }

  const keyboard = rbox(0.42, 0.018, 0.13, 0.005, colors.graphite, 0.6);
  keyboard.position.set(-0.05, 0.773, -0.18);
  const keys = box(0.39, 0.004, 0.105, 0x3a3b40, 0.7);
  keys.position.set(-0.05, 0.784, -0.18);
  const mouse = rbox(0.06, 0.022, 0.1, 0.02, colors.graphite, 0.5);
  mouse.position.set(0.3, 0.775, -0.17);
  desk.add(keyboard, keys, mouse);

  const tower = rbox(0.22, 0.48, 0.46, 0.01, colors.steel, 0.4, 0.5);
  tower.position.set(-0.85, 0.24, 0.02);
  desk.add(tower);
  const towerLed = ledMesh(0.03, leds, random);
  towerLed.position.set(-0.85, 0.42, -0.215);
  desk.add(towerLed);

  // Warm LED strip under the front edge.
  const strip = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.012, 0.012), glow(colors.accent, 1.3));
  strip.position.set(0, 0.712, -0.36);
  desk.add(strip, pointLight(0xffc070, 0.5, 1.6, 0, 0.5, -0.5));

  // Articulated lamp at the right end; a real spot so the desk gets a pool.
  const lampBase = cyl(0.07, 0.075, 0.025, colors.black, 18, 0.45, 0.5);
  lampBase.position.set(0.88, 0.773, 0.18);
  const armLower = box(0.016, 0.36, 0.016, colors.black, 0.45, 0.5);
  armLower.position.set(0.84, 0.94, 0.12);
  armLower.rotation.x = 0.35;
  const armUpper = box(0.016, 0.32, 0.016, colors.black, 0.45, 0.5);
  armUpper.position.set(0.76, 1.15, -0.02);
  armUpper.rotation.x = -0.9;
  armUpper.rotation.z = 0.5;
  const shade = lathe(
    [
      [0.02, 0],
      [0.03, 0.02],
      [0.08, 0.11],
      [0.075, 0.11]
    ],
    new THREE.MeshStandardMaterial({ color: colors.black, roughness: 0.5, metalness: 0.4, side: THREE.DoubleSide }),
    20
  );
  shade.position.set(0.66, 1.25, -0.12);
  shade.rotation.x = Math.PI;
  shade.rotation.z = -0.35;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 10), glow(0xffe2b0, 1.6));
  bulb.position.set(0.645, 1.19, -0.12);
  desk.add(lampBase, armLower, armUpper, shade, bulb);

  const spot = new THREE.SpotLight(0xffd9a6, 5, 3.4, 0.85, 0.65, 2);
  spot.position.set(0.64, 1.2, -0.12);
  spot.target.position.set(0.1, 0.74, -0.1);
  spot.castShadow = true;
  spot.shadow.mapSize.set(512, 512);
  spot.shadow.bias = -0.002;
  spot.shadow.camera.near = 0.05;
  spot.shadow.camera.far = 3.5;
  desk.add(spot, spot.target);

  // Clutter: a small plant and a mug gone cold.
  const deskPot = lathe(
    [
      [0, 0],
      [0.04, 0],
      [0.05, 0.08],
      [0.045, 0.08],
      [0, 0.02]
    ],
    mat(0x2f2a24, 0.7)
  );
  deskPot.position.set(-0.95, 0.76, 0.22);
  desk.add(deskPot);
  const sprigs: LeafPlacement[] = [];
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * Math.PI * 2;
    sprigs.push({
      position: new THREE.Vector3(-0.95 + Math.cos(a) * 0.01, 0.83, 0.22 + Math.sin(a) * 0.01),
      rotation: new THREE.Euler(0.5 + random() * 0.4, a, 0),
      scale: 0.08 + random() * 0.04,
      tint: random() * 0.06
    });
  }
  desk.add(leafCluster(sprigs, leafGeometry(0.3, 1), colors.leaf));
  const deskMug = lathe(
    [
      [0, 0],
      [0.04, 0],
      [0.042, 0.09],
      [0.038, 0.09],
      [0.036, 0.01],
      [0, 0.01]
    ],
    mat(0x98938a, 0.5)
  );
  deskMug.position.set(0.55, 0.76, -0.12);
  desk.add(deskMug);

  scene.add(desk);

  // Office chair, back to the room, pushed up to the desk.
  const chair = new THREE.Group();
  chair.position.set(-2.4, 0, 2.15);
  const seat = rbox(0.5, 0.08, 0.48, 0.035, 0x2a2622, 0.9);
  seat.position.y = 0.48;
  const back = rbox(0.46, 0.56, 0.06, 0.03, 0x2a2622, 0.9);
  back.position.set(0, 0.86, -0.25);
  back.rotation.x = -0.12;
  const spine = box(0.05, 0.36, 0.03, colors.black, 0.4, 0.5);
  spine.position.set(0, 0.6, -0.26);
  const lift = cyl(0.025, 0.025, 0.36, 0x7a7a7e, 12, 0.3, 0.9);
  lift.position.y = 0.26;
  chair.add(seat, back, spine, lift);
  for (let i = 0; i < 5; i += 1) {
    const a = (i / 5) * Math.PI * 2;
    const leg = box(0.3, 0.025, 0.035, colors.black, 0.45, 0.5);
    leg.position.set(Math.cos(a) * 0.15, 0.07, Math.sin(a) * 0.15);
    leg.rotation.y = -a;
    const caster = new THREE.Mesh(new THREE.SphereGeometry(0.025, 10, 8), mat(colors.black, 0.4));
    caster.position.set(Math.cos(a) * 0.29, 0.03, Math.sin(a) * 0.29);
    chair.add(leg, caster);
  }
  scene.add(chair);

  // The "work" neon on the slats.
  const work = new THREE.Mesh(
    new THREE.PlaneGeometry(1.05, 0.39),
    new THREE.MeshBasicMaterial({ map: makeNeonTexture("work", "#ff6a5e"), transparent: true, depthWrite: false })
  );
  work.position.set(-2.4, 2.25, 3.44);
  work.rotation.y = Math.PI;
  scene.add(work, pointLight(0xff6a5e, 0.7, 2.4, -2.4, 2.2, 3.1));
}

function buildRack(scene: THREE.Scene, leds: BlinkingLed[], random: () => number): void {
  const rack = new THREE.Group();
  rack.position.set(-3.55, 0, 1.0);

  const body = rbox(0.86, 2.06, 1.16, 0.02, 0x26282c, 0.42, 0.6);
  body.position.y = 1.05;
  rack.add(body);
  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(1.0, 1.86),
    new THREE.MeshPhysicalMaterial({ color: 0x223040, transparent: true, opacity: 0.18, roughness: 0.15 })
  );
  glass.position.set(0.437, 1.06, 0);
  glass.rotation.y = Math.PI / 2;
  rack.add(glass);

  for (let i = 0; i < 6; i += 1) {
    const unit = rbox(0.03, 0.2, 0.98, 0.004, 0x1d1f23, 0.5, 0.4);
    unit.position.set(0.415, 0.32 + i * 0.29, 0);
    rack.add(unit);
    for (let l = 0; l < 4; l += 1) {
      const color = l === 3 && i % 2 === 0 ? 0x5ec8ff : l === 2 && i === 4 ? 0xff7a4a : colors.accent;
      const led = ledMesh(0.022, leds, random, color);
      led.rotation.y = Math.PI / 2;
      led.position.set(0.432, 0.32 + i * 0.29 + 0.05, 0.38 - l * 0.08);
      rack.add(led);
    }
    for (let v = 0; v < 6; v += 1) {
      const vent = box(0.004, 0.008, 0.36, 0x3a3c42, 0.6);
      vent.position.set(0.432, 0.26 + i * 0.29 + v * 0.018, -0.18);
      rack.add(vent);
    }
  }
  rack.add(pointLight(0xd6b45f, 0.7, 2.4, 0.9, 1.3, 0), pointLight(0x5ec8ff, 0.25, 1.4, 0.6, 0.6, 0.3));
  scene.add(rack);
}

function buildShelf(scene: THREE.Scene, random: () => number): void {
  const shelf = new THREE.Group();
  shelf.position.set(3.75, 0, -1.5);

  const backPanel = box(0.03, 2.25, 2.3, colors.walnut, 0.7);
  backPanel.position.set(0.2, 1.12, 0);
  shelf.add(backPanel);
  for (const sz of [-1.13, 1.13]) {
    const side = rbox(0.44, 2.25, 0.04, 0.008, colors.walnutLight, 0.6);
    side.position.set(0, 1.12, sz);
    shelf.add(side);
  }

  const bookGeometry = new THREE.BoxGeometry(1, 1, 1);
  const bookMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });
  const books: Array<{ matrix: THREE.Matrix4; color: THREE.Color }> = [];
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();

  for (let level = 0; level < 4; level += 1) {
    const surfaceY = 0.24 + level * 0.54;
    const plank = rbox(0.42, 0.035, 2.24, 0.006, colors.walnutLight, 0.6);
    plank.position.set(0, surfaceY, 0);
    shelf.add(plank);

    let bz = -1.08;
    let gapPlaced = false;
    while (bz < 1.04) {
      if (!gapPlaced && random() < 0.08) {
        // Leave room for an object.
        const objectZ = bz + 0.14;
        if (level === 1) {
          const vase = lathe(
            [
              [0, 0],
              [0.05, 0],
              [0.07, 0.08],
              [0.04, 0.2],
              [0.03, 0.26],
              [0.035, 0.27]
            ],
            mat(0xd9d2c0, 0.5)
          );
          vase.position.set(-0.04, surfaceY + 0.018, objectZ);
          shelf.add(vase);
        } else if (level === 2) {
          const frame = framedPrint(0.16, 0.2, "sun", colors.black);
          frame.position.set(0.0, surfaceY + 0.13, objectZ);
          frame.rotation.y = -Math.PI / 2;
          frame.rotation.x = 0;
          frame.rotateX(-0.12);
          shelf.add(frame);
        } else {
          const stack = 3 + Math.floor(random() * 3);
          for (let s = 0; s < stack; s += 1) {
            const t = 0.03 + random() * 0.015;
            position.set(-0.04, surfaceY + 0.018 + s * t + t / 2 + 0.002, objectZ);
            quaternion.setFromEuler(new THREE.Euler(0, (random() - 0.5) * 0.3, 0));
            scale.set(0.26, t, 0.18 + random() * 0.04);
            books.push({
              matrix: new THREE.Matrix4().compose(position.clone(), quaternion.clone(), scale.clone()),
              color: new THREE.Color(BOOK_COLORS[Math.floor(random() * BOOK_COLORS.length)])
            });
          }
        }
        bz += 0.3;
        gapPlaced = true;
        continue;
      }
      const thickness = 0.025 + random() * 0.04;
      const height = 0.22 + random() * 0.14;
      const lean = bz > 0.9 ? 0.25 : 0;
      position.set(-0.03 + random() * 0.02, surfaceY + 0.018 + height / 2, bz + thickness / 2);
      quaternion.setFromEuler(new THREE.Euler(lean, 0, 0));
      scale.set(0.24 + random() * 0.05, height, thickness);
      books.push({
        matrix: new THREE.Matrix4().compose(position.clone(), quaternion.clone(), scale.clone()),
        color: new THREE.Color(BOOK_COLORS[Math.floor(random() * BOOK_COLORS.length)]).offsetHSL(0, 0, (random() - 0.5) * 0.06)
      });
      bz += thickness + 0.004;
    }
  }
  const instanced = new THREE.InstancedMesh(bookGeometry, bookMaterial, books.length);
  books.forEach((book, index) => {
    instanced.setMatrixAt(index, book.matrix);
    instanced.setColorAt(index, book.color);
  });
  instanced.castShadow = true;
  instanced.receiveShadow = true;
  shelf.add(instanced);

  // A pothos on top, trailing down the side.
  const pot = lathe(
    [
      [0, 0],
      [0.07, 0],
      [0.08, 0.12],
      [0.075, 0.12],
      [0, 0.02]
    ],
    mat(0x2f2a24, 0.6)
  );
  pot.position.set(0, 2.26, -0.85);
  shelf.add(pot);
  const trail: LeafPlacement[] = [];
  for (let i = 0; i < 26; i += 1) {
    const t = i / 25;
    trail.push({
      position: new THREE.Vector3(-0.12 - t * 0.06, 2.36 - t * 1.1, -0.85 - t * 0.18 + Math.sin(t * 9) * 0.04),
      rotation: new THREE.Euler(random() - 0.5, random() * Math.PI * 2, -1.3 - random() * 0.5),
      scale: 0.07 + random() * 0.025,
      tint: random() * 0.08 - 0.02
    });
  }
  shelf.add(leafCluster(trail, leafGeometry(0.44, 1), colors.leafLight));

  scene.add(shelf);
}

/** Printer on a low cabinet against the back wall, facing the room. */
function buildPrinter(scene: THREE.Scene, leds: BlinkingLed[], random: () => number): RoomWorld["printer"] {
  const station = new THREE.Group();
  station.position.set(-0.7, 0, 3.1);

  const cabinet = rbox(0.85, 0.7, 0.62, 0.012, colors.walnut, 0.62);
  cabinet.position.y = 0.35;
  const drawerLine = box(0.8, 0.004, 0.005, 0x1a130c, 1);
  drawerLine.position.set(0, 0.36, -0.312);
  const body = rbox(0.5, 0.2, 0.4, 0.02, 0xe6e1d6, 0.55);
  body.position.set(0, 0.8, 0.02);
  const lid = rbox(0.46, 0.03, 0.34, 0.01, 0xd2ccc0, 0.5);
  lid.position.set(0, 0.915, 0.04);
  const slot = box(0.34, 0.012, 0.01, 0x101010, 1);
  slot.position.set(0, 0.79, -0.18);
  const tray = box(0.36, 0.008, 0.16, 0xbdb7aa, 0.5);
  tray.position.set(0, 0.73, -0.26);
  tray.rotation.x = 0.08;
  station.add(cabinet, drawerLine, body, lid, slot, tray);

  const led = ledMesh(0.018, leds, random, 0x7ad18a);
  led.position.set(0.19, 0.84, -0.18);
  station.add(led);
  scene.add(station);

  const paperMap = makeResumeTexture();
  paperMap.center.set(0.5, 0.5);
  paperMap.rotation = Math.PI;
  const paper = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.003, 0.42),
    new THREE.MeshStandardMaterial({ map: paperMap, roughness: 1 })
  );
  paper.position.set(-0.7, 0.745, 3.05);
  paper.rotation.x = 0.08;
  paper.visible = false;
  paper.castShadow = true;
  scene.add(paper);

  return { paper, homeZ: 3.05, travelZ: -0.42 };
}

/** Espresso station on a low sideboard; the gold mug steams. */
function buildCoffee(scene: THREE.Scene, leds: BlinkingLed[], random: () => number): THREE.Vector3 {
  const corner = new THREE.Group();
  corner.position.set(1.6, 0, 3.1);

  const board = rbox(0.7, 0.72, 0.62, 0.012, colors.walnut, 0.62);
  board.position.y = 0.36;
  const steel = mat(0xb9bcc2, 0.32, 0.85);
  const body = rbox(0.3, 0.34, 0.3, 0.03, steel);
  body.position.set(0.08, 0.89, 0.05);
  const head = cyl(0.04, 0.045, 0.05, 0x8c8f95, 18, 0.3, 0.9);
  head.position.set(0.08, 0.84, -0.12);
  const handle = box(0.025, 0.02, 0.14, colors.black, 0.5);
  handle.position.set(0.08, 0.81, -0.2);
  const dripTray = box(0.28, 0.02, 0.12, 0x2a2b2f, 0.4, 0.6);
  dripTray.position.set(0.08, 0.73, -0.12);
  const gauge = new THREE.Mesh(new THREE.CircleGeometry(0.03, 20), mat(0xefece3, 0.4));
  gauge.position.set(0.08, 0.98, -0.101);
  gauge.rotation.y = Math.PI;
  const grinder = cyl(0.06, 0.07, 0.24, colors.black, 18, 0.5, 0.3);
  grinder.position.set(-0.2, 0.84, 0.08);
  const hopper = cyl(0.07, 0.035, 0.12, 0x6a4a30, 18, 0.2);
  hopper.position.set(-0.2, 1.02, 0.08);
  corner.add(board, body, head, handle, dripTray, gauge, grinder, hopper);

  const mug = lathe(
    [
      [0, 0],
      [0.042, 0],
      [0.045, 0.085],
      [0.041, 0.085],
      [0.039, 0.01],
      [0, 0.01]
    ],
    mat(colors.accent, 0.45, 0.1)
  );
  mug.position.set(-0.08, 0.72, -0.2);
  corner.add(mug);

  const led = ledMesh(0.016, leds, random);
  led.position.set(0.17, 1.0, -0.101);
  corner.add(led);
  scene.add(corner);
  return new THREE.Vector3(1.52, 0.82, 2.9);
}

/* ------------------------------------------------------------------ */
/* Living area                                                          */
/* ------------------------------------------------------------------ */

function buildLivingArea(scene: THREE.Scene, random: () => number): THREE.MeshBasicMaterial {
  const rug = rbox(3.8, 0.014, 2.7, 0.005, new THREE.MeshStandardMaterial({ map: makeRugTexture(), roughness: 1 }));
  rug.position.set(0.55, 0.007, 0.45);
  rug.castShadow = false;
  scene.add(rug);

  // Cognac leather sofa, back to the right wall, facing the media wall.
  const sofa = new THREE.Group();
  sofa.position.set(2.4, 0, 0.25);
  sofa.rotation.y = Math.PI / 2;
  const leather = mat(colors.leather, 0.48);
  const leatherDark = mat(colors.leatherDark, 0.5);
  const base = rbox(2.2, 0.26, 0.92, 0.05, leatherDark);
  base.position.y = 0.27;
  const backrest = rbox(2.16, 0.5, 0.22, 0.08, leather);
  backrest.position.set(0, 0.62, 0.36);
  backrest.rotation.x = -0.1;
  sofa.add(base, backrest);
  for (const side of [-1, 1]) {
    const arm = rbox(0.2, 0.5, 0.92, 0.08, leatherDark);
    arm.position.set(side * 1.12, 0.42, 0);
    sofa.add(arm);
  }
  for (const cx of [-0.5, 0.5]) {
    const cushion = rbox(0.98, 0.16, 0.74, 0.07, leather);
    cushion.position.set(cx, 0.48, -0.06);
    sofa.add(cushion);
  }
  const pillowCream = rbox(0.38, 0.36, 0.13, 0.06, colors.cream, 1);
  pillowCream.position.set(-0.72, 0.72, 0.18);
  pillowCream.rotation.set(-0.25, 0, 0.18);
  const pillowDark = rbox(0.34, 0.34, 0.13, 0.06, 0x56624a, 1);
  pillowDark.position.set(0.78, 0.71, 0.18);
  pillowDark.rotation.set(-0.25, 0, -0.14);
  sofa.add(pillowCream, pillowDark);
  const blanketTop = rbox(0.3, 0.035, 0.72, 0.015, 0xb98a4e, 1);
  blanketTop.position.set(-1.12, 0.68, 0);
  const blanketFlap = rbox(0.035, 0.36, 0.72, 0.015, 0xb98a4e, 1);
  blanketFlap.position.set(-1.26, 0.5, 0);
  sofa.add(blanketTop, blanketFlap);
  for (const [fx, fz] of [
    [-1.0, -0.36],
    [1.0, -0.36],
    [-1.0, 0.36],
    [1.0, 0.36]
  ]) {
    const foot = cyl(0.022, 0.016, 0.14, colors.walnut, 10);
    foot.position.set(fx, 0.07, fz);
    sofa.add(foot);
  }
  scene.add(sofa);

  // Oval glass coffee table with the laptop (running Baton) and magazines.
  const table = new THREE.Group();
  table.position.set(0.95, 0, 0.3);
  const glassTop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.62, 0.022, 48),
    new THREE.MeshPhysicalMaterial({
      color: 0x7f9aa4,
      transparent: true,
      opacity: 0.1,
      roughness: 0.08,
      metalness: 0.2,
      depthWrite: false
    })
  );
  glassTop.scale.x = 0.72;
  glassTop.position.y = 0.4;
  table.add(glassTop);
  const lowerShelf = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.018, 40), mat(0x1e1f22, 0.3, 0.4));
  lowerShelf.scale.x = 0.72;
  lowerShelf.position.y = 0.15;
  lowerShelf.receiveShadow = true;
  table.add(lowerShelf);
  for (const [lx, lz] of [
    [-0.26, -0.44],
    [0.26, -0.44],
    [-0.26, 0.44],
    [0.26, 0.44]
  ]) {
    const leg = cyl(0.012, 0.012, 0.4, colors.black, 8, 0.4, 0.6);
    leg.position.set(lx, 0.2, lz);
    table.add(leg);
  }

  const laptop = new THREE.Group();
  laptop.position.set(0.04, 0.412, 0.08);
  laptop.rotation.y = 0.12;
  const aluminium = mat(0x8e9096, 0.35, 0.8);
  const laptopBase = rbox(0.31, 0.012, 0.22, 0.006, aluminium);
  laptopBase.position.y = 0.006;
  const keysPlate = box(0.27, 0.002, 0.1, 0x1c1d20, 0.6);
  keysPlate.position.set(0, 0.0125, -0.02);
  const hinge = new THREE.Group();
  hinge.position.set(0, 0.012, -0.108);
  hinge.rotation.x = -0.3;
  const laptopLid = rbox(0.31, 0.21, 0.008, 0.006, aluminium);
  laptopLid.position.set(0, 0.105, -0.004);
  const screenMaterial = new THREE.MeshBasicMaterial({ color: 0x0b0b0c });
  const laptopScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.286, 0.186), screenMaterial);
  laptopScreen.position.set(0, 0.107, 0.0005);
  hinge.add(laptopLid, laptopScreen);
  laptop.add(laptopBase, keysPlate, hinge);
  table.add(laptop, pointLight(0x9fb6de, 0.25, 0.9, 0.04, 0.6, 0.25));

  const magazineA = rbox(0.26, 0.01, 0.19, 0.003, 0x2f5f8a, 0.9);
  magazineA.position.set(-0.1, 0.165, 0.08);
  magazineA.rotation.y = 0.3;
  const magazineB = rbox(0.26, 0.01, 0.19, 0.003, colors.cream, 0.9);
  magazineB.position.set(-0.06, 0.178, 0.05);
  magazineB.rotation.y = 0.12;
  table.add(magazineA, magazineB);
  const bowl = lathe(
    [
      [0, 0],
      [0.04, 0],
      [0.09, 0.05],
      [0.085, 0.052],
      [0.035, 0.008],
      [0, 0.008]
    ],
    mat(0xd9d2c0, 0.45)
  );
  bowl.position.set(-0.08, 0.411, -0.32);
  table.add(bowl);
  scene.add(table);

  // Boucle lounge chair with a checkered cushion, on the rug.
  const lounge = new THREE.Group();
  lounge.position.set(0.04, 0, 0.5);
  lounge.rotation.y = -0.72;
  const boucle = mat(colors.boucle, 1);
  const loungeSeat = rbox(0.66, 0.28, 0.62, 0.12, boucle);
  loungeSeat.position.y = 0.26;
  const loungeBack = rbox(0.66, 0.5, 0.2, 0.09, boucle);
  loungeBack.position.set(0, 0.6, 0.24);
  loungeBack.rotation.x = 0.18;
  lounge.add(loungeSeat, loungeBack);
  for (const side of [-1, 1]) {
    const arm = rbox(0.15, 0.36, 0.6, 0.07, boucle);
    arm.position.set(side * 0.37, 0.42, 0);
    lounge.add(arm);
  }
  const cushion = rbox(0.46, 0.06, 0.44, 0.025, new THREE.MeshStandardMaterial({ map: makeCheckerTexture(), roughness: 1 }));
  cushion.position.set(0, 0.42, -0.04);
  lounge.add(cushion);
  scene.add(lounge);

  // Side table and the amber globe floor lamp by the glass.
  const side = new THREE.Group();
  side.position.set(3.3, 0, -2.55);
  const sideTop = cyl(0.24, 0.24, 0.025, colors.walnutLight, 32, 0.55);
  sideTop.position.y = 0.5;
  const sideStem = cyl(0.03, 0.03, 0.48, colors.walnut, 12);
  sideStem.position.y = 0.25;
  const sideFoot = cyl(0.16, 0.18, 0.025, colors.walnut, 28);
  sideFoot.position.y = 0.012;
  const bookA = rbox(0.2, 0.03, 0.14, 0.004, 0x3f4a55);
  bookA.position.set(0, 0.528, 0);
  bookA.rotation.y = 0.3;
  const bookB = rbox(0.18, 0.025, 0.13, 0.004, colors.accent);
  bookB.position.set(0.01, 0.555, 0.01);
  bookB.rotation.y = 0.1;
  side.add(sideTop, sideStem, sideFoot, bookA, bookB);
  scene.add(side);

  const globeLamp = new THREE.Group();
  globeLamp.position.set(3.45, 0, -2.95);
  const globeBase = cyl(0.13, 0.15, 0.03, colors.black, 24, 0.5, 0.4);
  globeBase.position.y = 0.015;
  const globePole = cyl(0.012, 0.012, 1.44, colors.black, 8, 0.5, 0.4);
  globePole.position.y = 0.75;
  const globe = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 18), glow(0xffb45e, 1.5));
  globe.position.y = 1.58;
  globeLamp.add(globeBase, globePole, globe, pointLight(0xffa64d, 4.5, 6, 0, 1.56, 0.1));
  scene.add(globeLamp);

  // Black metal cart beside the sofa.
  const cart = new THREE.Group();
  cart.position.set(3.55, 0, 0.55);
  for (const [px, pz] of [
    [-0.22, -0.16],
    [0.22, -0.16],
    [-0.22, 0.16],
    [0.22, 0.16]
  ]) {
    const post = box(0.02, 0.68, 0.02, colors.black, 0.4, 0.5);
    post.position.set(px, 0.34, pz);
    cart.add(post);
  }
  for (const sy of [0.18, 0.62]) {
    const plate = rbox(0.48, 0.02, 0.36, 0.006, colors.black, 0.4, 0.5);
    plate.position.y = sy;
    cart.add(plate);
  }
  const stackA = rbox(0.24, 0.05, 0.18, 0.004, 0x554438);
  stackA.position.set(-0.08, 0.655, 0);
  const stackB = rbox(0.22, 0.04, 0.16, 0.004, 0x98938a);
  stackB.position.set(-0.07, 0.7, 0.01);
  stackB.rotation.y = 0.2;
  const blanketRoll = rbox(0.3, 0.13, 0.24, 0.05, 0xb98a4e, 1);
  blanketRoll.position.set(-0.05, 0.26, 0);
  const basket = rbox(0.22, 0.14, 0.2, 0.02, 0x8a6a46, 1);
  basket.position.set(0.13, 0.26, 0.04);
  cart.add(stackA, stackB, blanketRoll, basket);
  scene.add(cart);

  // Paper lantern over the coffee table: the room's warm centre.
  const lantern = new THREE.Group();
  const LANTERN_Y = 2.52;
  lantern.position.set(0.95, LANTERN_Y, 0.25);
  const profile: Array<[number, number]> = [];
  for (let i = 0; i <= 16; i += 1) {
    const t = i / 16;
    const y = -0.2 + t * 0.4;
    const r = Math.sqrt(Math.max(0, 1 - (y / 0.22) ** 2)) * 0.25;
    profile.push([Math.max(0.0001, r), y]);
  }
  // Closed shell, front side only: the bulb inside must not leak through.
  const paperMaterial = new THREE.MeshStandardMaterial({
    color: 0xe9d8b8,
    emissive: 0xffc988,
    emissiveIntensity: 0.42,
    roughness: 1
  });
  const shell = lathe(profile, paperMaterial, 36);
  shell.castShadow = false;
  lantern.add(shell);
  const ribMaterial = new THREE.MeshBasicMaterial({ color: 0xc9a670, transparent: true, opacity: 0.55 });
  for (let i = 1; i < 9; i += 1) {
    const y = -0.2 + (i / 9) * 0.4;
    const r = Math.sqrt(Math.max(0, 1 - (y / 0.22) ** 2)) * 0.25 + 0.002;
    const rib = new THREE.Mesh(new THREE.TorusGeometry(r, 0.0025, 4, 40), ribMaterial);
    rib.rotation.x = Math.PI / 2;
    rib.position.y = y;
    lantern.add(rib);
  }
  const cordLength = CEILING_Y - LANTERN_Y - 0.2;
  const cord = cyl(0.004, 0.004, cordLength, 0x111111, 6);
  cord.position.y = 0.2 + cordLength / 2;
  cord.castShadow = false;
  lantern.add(cord);
  const lanternLight = new THREE.PointLight(0xffc890, 4.6, 8, 2);
  lanternLight.castShadow = true;
  lanternLight.shadow.mapSize.set(512, 512);
  lanternLight.shadow.bias = -0.004;
  lanternLight.shadow.radius = 4;
  lanternLight.shadow.camera.near = 0.32;
  lantern.add(lanternLight);
  scene.add(lantern);

  void random;
  return screenMaterial;
}

/* ------------------------------------------------------------------ */
/* Plants, door, roomba                                                 */
/* ------------------------------------------------------------------ */

function plantPot(radius: number, height: number, color: number): THREE.Mesh {
  return lathe(
    [
      [0, 0],
      [radius * 0.8, 0],
      [radius, height * 0.92],
      [radius * 1.04, height],
      [radius * 0.96, height],
      [radius * 0.9, height * 0.85],
      [0, height * 0.85]
    ],
    mat(color, 0.75)
  );
}

function buildFig(scene: THREE.Scene, x: number, z: number, random: () => number): void {
  const plant = new THREE.Group();
  plant.position.set(x, 0, z);
  plant.add(plantPot(0.2, 0.36, 0xc9c1b0));
  const soil = cyl(0.18, 0.18, 0.01, 0x2a1f16, 20);
  soil.position.y = 0.31;
  plant.add(soil);
  const trunkCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.3, 0),
    new THREE.Vector3(0.04, 0.9, 0.02),
    new THREE.Vector3(-0.03, 1.5, -0.03),
    new THREE.Vector3(0.02, 1.95, 0)
  ]);
  const trunk = finish(new THREE.Mesh(new THREE.TubeGeometry(trunkCurve, 16, 0.022, 6), mat(0x5a4632, 0.9)));
  plant.add(trunk);
  const leaves: LeafPlacement[] = [];
  for (let i = 0; i < 44; i += 1) {
    const t = 0.35 + (i / 44) * 0.65;
    const p = trunkCurve.getPoint(t);
    const a = i * 2.39996;
    leaves.push({
      position: new THREE.Vector3(p.x + Math.cos(a) * 0.03, p.y, p.z + Math.sin(a) * 0.03),
      rotation: new THREE.Euler(0.9 + random() * 0.5, a, 0, "YXZ"),
      scale: 0.2 + random() * 0.08 + (1 - t) * 0.06,
      tint: random() * 0.1 - 0.04
    });
  }
  plant.add(leafCluster(leaves, leafGeometry(0.42, 1), colors.leaf));
  scene.add(plant);
}

function buildMonstera(scene: THREE.Scene, x: number, z: number, scale: number, random: () => number): void {
  const plant = new THREE.Group();
  plant.position.set(x, 0, z);
  plant.scale.setScalar(scale);
  plant.add(plantPot(0.19, 0.3, 0x2f2a24));
  const stemMaterial = mat(0x3f5a33, 0.8);
  const leaves: LeafPlacement[] = [];
  for (let i = 0; i < 13; i += 1) {
    const a = i * 2.39996 + random() * 0.3;
    const reach = 0.18 + random() * 0.3;
    const h = 0.55 + random() * 0.65;
    const tip = new THREE.Vector3(Math.cos(a) * reach, h, Math.sin(a) * reach);
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(0, 0.26, 0),
      new THREE.Vector3(tip.x * 0.2, h * 0.8, tip.z * 0.2),
      tip
    );
    const stem = finish(new THREE.Mesh(new THREE.TubeGeometry(curve, 8, 0.008, 5), stemMaterial));
    plant.add(stem);
    leaves.push({
      position: tip,
      rotation: new THREE.Euler(1.2 + random() * 0.4, a + Math.PI / 2, 0, "YXZ"),
      scale: 0.32 + random() * 0.1,
      tint: random() * 0.08 - 0.03
    });
  }
  plant.add(leafCluster(leaves, leafGeometry(0.62, 0.9), 0x2f4a2a));
  scene.add(plant);
}

function buildDoorAndSwitch(scene: THREE.Scene): void {
  const door = new THREE.Group();
  const panel = rbox(0.05, 2.08, 0.96, 0.008, 0xcfc8ba, 0.6);
  panel.position.set(3.97, 1.04, 2.5);
  for (const [py, ph] of [
    [0.55, 0.8],
    [1.5, 0.9]
  ]) {
    const inset = box(0.01, ph, 0.72, 0xc4bdae, 0.6);
    inset.position.set(3.944, py, 2.5);
    door.add(inset);
  }
  const frameTop = box(0.06, 0.07, 1.12, colors.trim, 0.7);
  frameTop.position.set(3.97, 2.115, 2.5);
  const frameL = box(0.06, 2.12, 0.07, colors.trim, 0.7);
  frameL.position.set(3.97, 1.06, 1.985);
  const frameR = frameL.clone();
  frameR.position.z = 3.015;
  const rose = cyl(0.03, 0.03, 0.012, colors.accent, 16, 0.3, 0.9);
  rose.rotation.z = Math.PI / 2;
  rose.position.set(3.94, 1.02, 2.12);
  const lever = box(0.025, 0.02, 0.13, colors.accent, 0.3, 0.9);
  lever.position.set(3.92, 1.02, 2.17);
  door.add(panel, frameTop, frameL, frameR, rose, lever);
  scene.add(door);

  const plate = rbox(0.015, 0.09, 0.09, 0.004, 0xe6e1d6, 0.5);
  plate.position.set(3.99, 1.2, 3.2);
  const rocker = box(0.01, 0.045, 0.03, 0xd2ccc0, 0.5);
  rocker.position.set(3.98, 1.2, 3.2);
  scene.add(plate, rocker);
}

function buildRoomba(scene: THREE.Scene, leds: BlinkingLed[], random: () => number): THREE.Group {
  const roomba = new THREE.Group();
  roomba.position.set(0, 0, -1.5);
  const body = lathe(
    [
      [0, 0.012],
      [0.22, 0.012],
      [0.24, 0.04],
      [0.235, 0.08],
      [0.2, 0.09],
      [0, 0.09]
    ],
    mat(0x1b1c1f, 0.45, 0.2),
    36
  );
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.004, 6, 40), mat(0x5a5b60, 0.3, 0.8));
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.092;
  const bumper = rbox(0.05, 0.05, 0.3, 0.015, 0x2a2b2f, 0.6);
  bumper.position.set(0.21, 0.045, 0);
  const led = ledMesh(0.02, leds, random, 0x7ad18a);
  led.position.set(0.1, 0.095, 0);
  roomba.add(body, ring, bumper, led);
  scene.add(roomba);
  return roomba;
}

/* ------------------------------------------------------------------ */
/* Particles: snow over the fjord, steam, dust in the lamplight          */
/* ------------------------------------------------------------------ */

const particleVertex = /* glsl */ `
  uniform float uTime;
  uniform float uScale;
  uniform float uSize;
  uniform float uFall;
  uniform float uDrift;
  uniform vec3 uBoxMin;
  uniform vec3 uBoxSize;
  uniform float uMaxSize;
  attribute float aSeed;
  varying float vAlpha;
  varying float vSeed;
  void main() {
    vec3 p = position;
    float speed = 0.6 + aSeed * 0.8;
    p.y = uBoxMin.y + mod(p.y - uBoxMin.y - uTime * uFall * speed, uBoxSize.y);
    p.x += sin(uTime * 0.45 + aSeed * 31.0) * uDrift + uTime * uDrift * 0.18;
    p.x = uBoxMin.x + mod(p.x - uBoxMin.x, uBoxSize.x);
    p.z += cos(uTime * 0.37 + aSeed * 17.0) * uDrift * 0.6;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = min(uMaxSize, uSize * (0.55 + aSeed * 0.9) * uScale / max(0.1, -mv.z));
    gl_Position = projectionMatrix * mv;
    float edge = smoothstep(0.0, 0.12, (p.y - uBoxMin.y) / uBoxSize.y) * smoothstep(1.0, 0.85, (p.y - uBoxMin.y) / uBoxSize.y);
    vAlpha = edge;
    vSeed = aSeed;
  }
`;

const particleFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;
  varying float vSeed;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.05, d) * vAlpha * uOpacity * (0.55 + vSeed * 0.45);
    if (a < 0.01) discard;
    gl_FragColor = vec4(uColor, a);
  }
`;

type ParticleConfig = {
  count: number;
  min: THREE.Vector3;
  size: THREE.Vector3;
  pointSize: number;
  fall: number;
  drift: number;
  color: number;
  opacity: number;
  maxSize: number;
  seed: number;
  additive?: boolean;
};

function particleField(config: ParticleConfig): { points: THREE.Points; uniforms: Record<string, THREE.IUniform> } {
  const random = createRandom(config.seed);
  const positions = new Float32Array(config.count * 3);
  const seeds = new Float32Array(config.count);
  for (let i = 0; i < config.count; i += 1) {
    positions[i * 3] = config.min.x + random() * config.size.x;
    positions[i * 3 + 1] = config.min.y + random() * config.size.y;
    positions[i * 3 + 2] = config.min.z + random() * config.size.z;
    seeds[i] = random();
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  const uniforms: Record<string, THREE.IUniform> = {
    uTime: { value: 0 },
    uScale: { value: 600 },
    uSize: { value: config.pointSize },
    uFall: { value: config.fall },
    uDrift: { value: config.drift },
    uBoxMin: { value: config.min },
    uBoxSize: { value: config.size },
    uMaxSize: { value: config.maxSize },
    uColor: { value: new THREE.Color(config.color) },
    uOpacity: { value: config.opacity }
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: particleVertex,
    fragmentShader: particleFragment,
    transparent: true,
    depthWrite: false,
    blending: config.additive ? THREE.AdditiveBlending : THREE.NormalBlending
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return { points, uniforms };
}

function buildFx(scene: THREE.Scene, steamOrigin: THREE.Vector3): RoomFx {
  const snow = particleField({
    count: 2600,
    min: new THREE.Vector3(-16, -9, -22),
    size: new THREE.Vector3(32, 17, 18.2),
    pointSize: 0.05,
    fall: 0.55,
    drift: 0.35,
    color: 0xe8eefc,
    opacity: 0.85,
    maxSize: 9,
    seed: 9
  });
  const steam = particleField({
    count: 26,
    min: new THREE.Vector3(steamOrigin.x - 0.03, steamOrigin.y, steamOrigin.z - 0.03),
    size: new THREE.Vector3(0.06, 0.32, 0.06),
    pointSize: 0.07,
    fall: -0.08,
    drift: 0.02,
    color: 0xf2ece0,
    opacity: 0.16,
    maxSize: 48,
    seed: 3
  });
  const dust = particleField({
    count: 60,
    min: new THREE.Vector3(0.2, 0.6, -0.5),
    size: new THREE.Vector3(1.6, 1.6, 1.5),
    pointSize: 0.008,
    fall: 0.01,
    drift: 0.06,
    color: 0xffd9a0,
    opacity: 0.22,
    maxSize: 2.5,
    seed: 21,
    additive: true
  });
  scene.add(snow.points, steam.points, dust.points);
  const all = [snow.uniforms, steam.uniforms, dust.uniforms];
  return {
    update(time: number): void {
      for (const uniforms of all) {
        uniforms.uTime.value = time;
      }
    },
    setPointScale(scale: number): void {
      for (const uniforms of all) {
        uniforms.uScale.value = scale;
      }
    }
  };
}

/* ------------------------------------------------------------------ */
/* Lighting                                                             */
/* ------------------------------------------------------------------ */

function buildLights(scene: THREE.Scene): LightRig {
  RectAreaLightUniformsLib.init();

  const ambient = new THREE.AmbientLight(0x7d86a0, 0.22);
  const hemisphere = new THREE.HemisphereLight(0x55607a, 0x3a2c1c, 0.4);
  scene.add(ambient, hemisphere);

  // Moon and city light through the glass; the mullions throw long shadows.
  const moon = new THREE.DirectionalLight(0xa6b8de, 1.0);
  moon.position.set(2.4, 6.5, -5.5);
  moon.target.position.set(-0.6, 0, 1.6);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  moon.shadow.camera.left = -6;
  moon.shadow.camera.right = 6;
  moon.shadow.camera.top = 6;
  moon.shadow.camera.bottom = -6;
  moon.shadow.camera.near = 0.5;
  moon.shadow.camera.far = 20;
  moon.shadow.bias = -0.0006;
  moon.shadow.normalBias = 0.02;
  moon.shadow.radius = 3;
  scene.add(moon, moon.target);

  const cityGlow = new THREE.RectAreaLight(0x8fa6d6, 1.7, 8.0, 2.9);
  cityGlow.position.set(0, 1.5, -3.45);
  cityGlow.lookAt(0, 1.1, 2);
  scene.add(cityGlow);

  // Ceiling downlights; off by default, on with the wall switch.
  const downlight = new THREE.MeshStandardMaterial({ color: 0x2a2724, emissive: 0xffe2b8, emissiveIntensity: 0, roughness: 0.4 });
  const ringMaterial = mat(0xd8d2c6, 0.5);
  const fillConfigs: Array<[number, number, number, number]> = [
    [-1.8, CEILING_Y - 0.02, 1.4, 6],
    [1.6, CEILING_Y - 0.02, 1.6, 6],
    [-2.0, CEILING_Y - 0.02, -1.4, 5],
    [1.8, CEILING_Y - 0.02, -1.6, 5]
  ];
  const fills: THREE.PointLight[] = [];
  const fillIntensities: number[] = [];
  for (const [x, y, z, intensity] of fillConfigs) {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.01, 24), ringMaterial);
    ring.position.set(x, y + 0.01, z);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.05, 24), downlight);
    disc.rotation.x = Math.PI / 2;
    disc.position.set(x, y + 0.004, z);
    scene.add(ring, disc);
    const fill = new THREE.PointLight(0xffe2b8, 0, 9, 2);
    fill.position.set(x, y - 0.12, z);
    scene.add(fill);
    fills.push(fill);
    fillIntensities.push(intensity);
  }

  return { ambient, hemisphere, fills, fillIntensities, downlight };
}

/* ------------------------------------------------------------------ */

export function buildWorld(): RoomWorld {
  materialCache = new Map();
  const random = createRandom(4321);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a101d);

  const cityscape = createCityscape();
  const leds: BlinkingLed[] = [];

  buildShell(scene, cityscape, random);
  buildSlatWall(scene);
  buildGallery(scene);
  const media = buildMediaWall(scene, random);
  buildHomeOffice(scene, leds, random);
  buildRack(scene, leds, random);
  buildShelf(scene, random);
  const printer = buildPrinter(scene, leds, random);
  const steamOrigin = buildCoffee(scene, leds, random);
  const laptopScreen = buildLivingArea(scene, random);
  buildDoorAndSwitch(scene);
  buildFig(scene, 2.35, -3.05, random);
  buildMonstera(scene, -2.9, -3.0, 1.15, random);
  buildMonstera(scene, 0.95, -3.22, 0.75, random);
  const roomba = buildRoomba(scene, leds, random);
  const lighting = buildLights(scene);
  const fx = buildFx(scene, steamOrigin);

  const colliders: RectCollider[] = [
    { minX: -3.95, maxX: -3.42, minZ: -2.05, maxZ: -0.05 }, // media console
    { minX: -4.0, maxX: -3.07, minZ: 0.4, maxZ: 1.6 }, // rack
    { minX: -1.15, maxX: -0.25, minZ: 2.75, maxZ: 3.45 }, // printer cabinet
    { minX: -3.55, maxX: -1.25, minZ: 2.62, maxZ: 3.45 }, // desk
    { minX: -2.72, maxX: -2.08, minZ: 1.85, maxZ: 2.48 }, // office chair
    { minX: 1.8, maxX: 2.9, minZ: -1.1, maxZ: 1.6 }, // sofa
    { minX: 0.5, maxX: 1.4, minZ: -0.35, maxZ: 0.95 }, // glass coffee table
    { minX: -0.38, maxX: 0.42, minZ: 0.08, maxZ: 0.92 }, // boucle chair
    { minX: 3.05, maxX: 3.55, minZ: -2.8, maxZ: -2.3 }, // side table
    { minX: 3.25, maxX: 3.65, minZ: -3.15, maxZ: -2.75 }, // globe lamp
    { minX: 3.3, maxX: 3.8, minZ: 0.35, maxZ: 0.75 }, // cart
    { minX: 1.25, maxX: 1.95, minZ: 2.78, maxZ: 3.45 }, // coffee station
    { minX: 3.4, maxX: 4.0, minZ: -2.65, maxZ: -0.35 }, // shelf
    { minX: -3.95, maxX: -3.5, minZ: -3.05, maxZ: -2.4 }, // marquee poster
    { minX: 2.1, maxX: 2.6, minZ: -3.3, maxZ: -2.8 }, // fig
    { minX: -3.2, maxX: -2.6, minZ: -3.3, maxZ: -2.7 } // monstera
  ];

  const bounds: RectCollider = { minX: -3.65, maxX: 3.65, minZ: -3.05, maxZ: 3.3 };

  return {
    scene,
    colliders,
    bounds,
    leds,
    printer,
    roomba,
    record: media.record,
    recordPosition: media.recordPosition,
    clock: media.clock,
    laptopScreen,
    cityscape,
    lighting,
    fx
  };
}
