import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { hotspots, type Hotspot } from "./hotspots";
import { createHud, createTouchControls, type StatusLine } from "./hud";
import { createPlayer, EYE_HEIGHT, lookPlayer, updatePlayer } from "./player";
import { fetchHomelabStatus, serviceStateGlyph, type HomelabStatus, type ServiceState } from "./status";
import { buildWorld, type RectCollider } from "./world";

const RENDER_SCALE = 0.5;
const PRINT_DURATION = 1.4;
const ROOMBA_SPEED = 0.55;
const ROOMBA_RADIUS = 0.28;
const TOUCH_LOOK_SENSITIVITY = 0.35;

function statusTone(state: ServiceState): StatusLine["tone"] {
  switch (state) {
    case "up":
      return "accent";
    case "degraded":
      return "muted";
    case "down":
      return "faint";
    default: {
      const exhaustive: never = state;
      throw new Error(`unhandled service state: ${String(exhaustive)}`);
    }
  }
}

function statusLines(status: HomelabStatus): StatusLine[] {
  const lines: StatusLine[] = status.services.map((service) => ({
    text: `${serviceStateGlyph(service.state)} ${service.name} — ${service.state}`,
    tone: statusTone(service.state)
  }));
  lines.push({ text: `uptime — ${status.uptime}`, tone: "muted" });
  return lines;
}

function roombaHits(x: number, z: number, colliders: RectCollider[], bounds: RectCollider): boolean {
  if (x < bounds.minX || x > bounds.maxX || z < bounds.minZ || z > bounds.maxZ) {
    return true;
  }
  for (const box of colliders) {
    if (
      x + ROOMBA_RADIUS > box.minX &&
      x - ROOMBA_RADIUS < box.maxX &&
      z + ROOMBA_RADIUS > box.minZ &&
      z - ROOMBA_RADIUS < box.maxZ
    ) {
      return true;
    }
  }
  return false;
}

function applyLook(camera: THREE.PerspectiveCamera, yaw: number, pitch: number, x: number, z: number): void {
  camera.position.set(x, EYE_HEIGHT, z);
  camera.rotation.set(pitch, yaw, 0, "YXZ");
}

export function initRoom(): void {
  const stage = document.getElementById("room-stage");
  const canvas = document.getElementById("room-canvas");
  if (!(stage instanceof HTMLElement) || !(canvas instanceof HTMLCanvasElement)) {
    return;
  }
  const loading = stage.querySelector<HTMLElement>(".room-loading");
  const fallback = stage.querySelector<HTMLElement>(".room-fallback");
  const lookHint = stage.querySelector<HTMLElement>(".room-look-hint");

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  } catch {
    if (loading) loading.hidden = true;
    if (fallback) fallback.hidden = false;
    return;
  }

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setPixelRatio(1);

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;

  const world = buildWorld();
  const player = createPlayer();

  // Dev-only pose fixture for deterministic screenshots: /room?pose=yaw,pitch,x,z
  if (import.meta.env.DEV) {
    const pose = new URLSearchParams(window.location.search).get("pose");
    if (pose) {
      const [yaw, pitch, px, pz] = pose.split(",").map(Number);
      if ([yaw, pitch, px, pz].every(Number.isFinite)) {
        player.yaw = yaw;
        player.pitch = pitch;
        player.x = px;
        player.z = pz;
      }
    }
  }

  const camera = new THREE.PerspectiveCamera(72, 1, 0.08, 140);
  applyLook(camera, player.yaw, player.pitch, player.x, player.z);

  // Subtle bloom makes the city lights, LEDs, and lamps glow. An 8-bit
  // target keeps the pipeline working on software/half-float-less WebGL.
  const composerTarget = new THREE.WebGLRenderTarget(1, 1, { type: THREE.UnsignedByteType });
  const composer = new EffectComposer(renderer, composerTarget);
  composer.addPass(new RenderPass(world.scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.42, 0.4, 0.66);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const hud = createHud(stage);
  const touch = createTouchControls(stage);

  // The lamps carry the room by default; the wall switch turns on the
  // ceiling downlights for the bright version.
  let lightsOn = false;
  const applyLightMode = (): void => {
    const rig = world.lighting;
    rig.ambient.intensity = lightsOn ? 1.5 : 0.72;
    rig.hemisphere.intensity = lightsOn ? 2.1 : 1.02;
    for (let i = 0; i < rig.fills.length; i += 1) {
      rig.fills[i].intensity = lightsOn ? rig.fillIntensities[i] : 0;
    }
    renderer.toneMappingExposure = lightsOn ? 1.7 : 1.45;
  };
  applyLightMode();

  const resize = (): void => {
    const width = Math.max(1, stage.clientWidth);
    const height = Math.max(1, stage.clientHeight);
    const scaledWidth = Math.floor(width * RENDER_SCALE);
    const scaledHeight = Math.floor(height * RENDER_SCALE);
    renderer.setSize(scaledWidth, scaledHeight, false);
    composer.setSize(scaledWidth, scaledHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);

  const pressedKeys = new Set<string>();
  let interactQueued = false;
  let activeHotspot: Hotspot | null = null;
  let openHotspotId: Hotspot["id"] | null = null;
  let touchLookPointer: number | null = null;
  let lastTouchLookX = 0;
  let lastTouchLookY = 0;

  const setLooking = (next: boolean): void => {
    stage.classList.toggle("is-looking", next);
    if (lookHint) {
      lookHint.hidden = next || hud.isDialogOpen();
    }
  };

  // Re-enter look mode after a dialog closes so walking resumes without an
  // extra click. The dialog itself stays unlocked so links stay clickable.
  const relock = (): void => {
    if (coarsePointer || document.pointerLockElement === canvas) {
      return;
    }
    const request = canvas.requestPointerLock() as unknown;
    if (request instanceof Promise) {
      request.catch(() => {});
    }
  };

  const closeDialog = (): void => {
    hud.hideDialog();
    openHotspotId = null;
    relock();
    if (lookHint) {
      lookHint.hidden = document.pointerLockElement === canvas;
    }
  };

  const openHotspot = (hotspot: Hotspot): void => {
    // The light switch toggles instantly instead of opening a dialog.
    if (hotspot.id === "lights") {
      lightsOn = !lightsOn;
      applyLightMode();
      hotspot.prompt = lightsOn ? "lights off" : "lights on";
      hud.showPrompt(hotspot.prompt);
      return;
    }

    hud.showDialog({ title: hotspot.title, lines: hotspot.lines, link: hotspot.link });
    openHotspotId = hotspot.id;
    // Unlock after the dialog flag is set so the browser's cursor-restore
    // delta cannot spin the camera.
    if (document.pointerLockElement === canvas) {
      document.exitPointerLock();
    }
    if (lookHint) {
      lookHint.hidden = true;
    }

    if (hotspot.id === "printer") {
      printProgress = 0;
      printing = true;
      world.printerPaper.visible = true;
    }

    if (hotspot.id === "rack") {
      void fetchHomelabStatus().then((status) => {
        if (openHotspotId !== "rack") {
          return;
        }
        const note =
          status.source === "demo"
            ? "demo data — the rack isn't wired to the vps yet"
            : "live from the vps";
        hud.showDialogStatus(statusLines(status), note);
      });
    }
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    const target = event.target;
    if (target instanceof HTMLElement && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
      return;
    }
    if (event.key === "Escape" && hud.isDialogOpen()) {
      closeDialog();
      return;
    }
    if (event.key === "e" || event.key === "E" || event.key === "Enter") {
      if (event.key === "Enter" && target instanceof HTMLAnchorElement) {
        return;
      }
      interactQueued = true;
      return;
    }
    const isMovementKey = [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "w",
      "a",
      "s",
      "d",
      "W",
      "A",
      "S",
      "D"
    ].includes(event.key);
    if (isMovementKey) {
      if (event.key.startsWith("Arrow")) {
        event.preventDefault();
      }
      pressedKeys.add(event.key.toLowerCase());
    }
  };

  const onKeyUp = (event: KeyboardEvent): void => {
    pressedKeys.delete(event.key.toLowerCase());
  };

  const onBlur = (): void => {
    pressedKeys.clear();
  };

  let swallowNextLookEvent = false;

  const onPointerLockChange = (): void => {
    const locked = document.pointerLockElement === canvas;
    // Browsers may report one huge movement delta right after a lock
    // transition in either direction.
    swallowNextLookEvent = true;
    setLooking(locked);
  };

  const onMouseLook = (event: MouseEvent): void => {
    if (document.pointerLockElement !== canvas || hud.isDialogOpen()) {
      return;
    }
    if (swallowNextLookEvent) {
      swallowNextLookEvent = false;
      return;
    }
    lookPlayer(player, event.movementX, event.movementY);
  };

  const onCanvasClick = (event: MouseEvent): void => {
    if (coarsePointer || hud.isDialogOpen()) {
      return;
    }
    if (document.pointerLockElement !== canvas) {
      event.preventDefault();
      void canvas.requestPointerLock();
    }
  };

  const onCanvasPointerDown = (event: PointerEvent): void => {
    if (!coarsePointer || hud.isDialogOpen() || event.pointerType === "mouse") {
      return;
    }
    touchLookPointer = event.pointerId;
    lastTouchLookX = event.clientX;
    lastTouchLookY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
    setLooking(true);
    event.preventDefault();
  };

  const onCanvasPointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== touchLookPointer) {
      return;
    }
    lookPlayer(
      player,
      (event.clientX - lastTouchLookX) * TOUCH_LOOK_SENSITIVITY,
      (event.clientY - lastTouchLookY) * TOUCH_LOOK_SENSITIVITY
    );
    lastTouchLookX = event.clientX;
    lastTouchLookY = event.clientY;
  };

  const onCanvasPointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== touchLookPointer) {
      return;
    }
    touchLookPointer = null;
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  document.addEventListener("pointerlockchange", onPointerLockChange);
  document.addEventListener("mousemove", onMouseLook);
  canvas.addEventListener("click", onCanvasClick);
  canvas.addEventListener("pointerdown", onCanvasPointerDown);
  canvas.addEventListener("pointermove", onCanvasPointerMove);
  canvas.addEventListener("pointerup", onCanvasPointerUp);
  canvas.addEventListener("pointercancel", onCanvasPointerUp);

  const roombaVelocity = new THREE.Vector2(ROOMBA_SPEED, 0.2);
  let printing = false;
  let printProgress = 0;
  let firstFrame = true;

  let lastFrameTime: number | null = null;

  const disposeMaterial = (material: THREE.Material): void => {
    const maps = [
      "map",
      "emissiveMap",
      "normalMap",
      "roughnessMap",
      "metalnessMap"
    ] as const;
    for (const key of maps) {
      const texture = (material as THREE.MeshStandardMaterial)[key];
      texture?.dispose();
    }
    material.dispose();
  };

  const dispose = (): void => {
    renderer.setAnimationLoop(null);
    resizeObserver.disconnect();
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", onBlur);
    document.removeEventListener("pointerlockchange", onPointerLockChange);
    document.removeEventListener("mousemove", onMouseLook);
    canvas.removeEventListener("click", onCanvasClick);
    canvas.removeEventListener("pointerdown", onCanvasPointerDown);
    canvas.removeEventListener("pointermove", onCanvasPointerMove);
    canvas.removeEventListener("pointerup", onCanvasPointerUp);
    canvas.removeEventListener("pointercancel", onCanvasPointerUp);
    world.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) {
        return;
      }
      object.geometry.dispose();
      if (Array.isArray(object.material)) {
        for (const material of object.material) {
          disposeMaterial(material);
        }
        return;
      }
      disposeMaterial(object.material);
    });
    composer.dispose();
    renderer.dispose();
  };
  window.addEventListener("pagehide", dispose, { once: true });

  renderer.setAnimationLoop((frameTime: number) => {
    const elapsed = frameTime / 1000;
    const dt = lastFrameTime === null ? 0.016 : Math.min(0.05, elapsed - lastFrameTime);
    lastFrameTime = elapsed;

    let strafe = 0;
    let forward = 0;
    if (!hud.isDialogOpen()) {
      if (pressedKeys.has("arrowleft") || pressedKeys.has("a")) strafe -= 1;
      if (pressedKeys.has("arrowright") || pressedKeys.has("d")) strafe += 1;
      if (pressedKeys.has("arrowup") || pressedKeys.has("w")) forward += 1;
      if (pressedKeys.has("arrowdown") || pressedKeys.has("s")) forward -= 1;
      const touchMove = touch.readMove();
      strafe += touchMove.x;
      forward -= touchMove.z;
    }
    updatePlayer(player, strafe, forward, dt, world.colliders, world.bounds);

    // Roomba wanders and bounces off furniture; its hotspot follows it.
    const nextRoombaX = world.roomba.position.x + roombaVelocity.x * dt;
    const nextRoombaZ = world.roomba.position.z + roombaVelocity.y * dt;
    if (roombaHits(nextRoombaX, world.roomba.position.z, world.colliders, world.bounds)) {
      roombaVelocity.x *= -1;
      roombaVelocity.y += (Math.random() - 0.5) * 0.3;
    } else {
      world.roomba.position.x = nextRoombaX;
    }
    if (roombaHits(world.roomba.position.x, nextRoombaZ, world.colliders, world.bounds)) {
      roombaVelocity.y *= -1;
      roombaVelocity.x += (Math.random() - 0.5) * 0.3;
    } else {
      world.roomba.position.z = nextRoombaZ;
    }
    roombaVelocity.normalize().multiplyScalar(ROOMBA_SPEED);
    world.roomba.rotation.y = Math.atan2(roombaVelocity.x, roombaVelocity.y) - Math.PI / 2;
    const roombaHotspot = hotspots.find((hotspot) => hotspot.id === "roomba");
    if (roombaHotspot) {
      roombaHotspot.x = world.roomba.position.x;
      roombaHotspot.z = world.roomba.position.z;
    }

    for (const led of world.leds) {
      led.material.emissiveIntensity = 0.5 + 0.5 * Math.sin(elapsed * led.speed + led.phase);
    }

    if (printing) {
      printProgress = Math.min(1, printProgress + dt / PRINT_DURATION);
      const ease = 1 - (1 - printProgress) * (1 - printProgress);
      world.printerPaper.position.x = world.printerPaperHomeX + ease * world.printerPaperTravelX;
      if (printProgress >= 1) {
        printing = false;
      }
    }

    if (!reducedMotion) {
      world.cityscape.update(elapsed);
    }

    let nearest: Hotspot | null = null;
    let nearestDistance = Infinity;
    for (const hotspot of hotspots) {
      const distance = Math.hypot(player.x - hotspot.x, player.z - hotspot.z);
      if (distance < hotspot.radius && distance < nearestDistance) {
        nearest = hotspot;
        nearestDistance = distance;
      }
    }
    activeHotspot = nearest;
    if (activeHotspot && !hud.isDialogOpen()) {
      hud.showPrompt(activeHotspot.prompt);
    } else {
      hud.hidePrompt();
    }

    if (touch.consumeInteract()) {
      interactQueued = true;
    }
    if (interactQueued) {
      interactQueued = false;
      if (hud.isDialogOpen()) {
        closeDialog();
      } else if (activeHotspot) {
        openHotspot(activeHotspot);
      }
    }

    applyLook(camera, player.yaw, player.pitch, player.x, player.z);
    composer.render();

    if (firstFrame) {
      firstFrame = false;
      if (loading) {
        loading.classList.add("is-done");
      }
    }
  });
}
