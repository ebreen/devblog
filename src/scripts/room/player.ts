import * as THREE from "three";
import type { RectCollider } from "./world";

export const PLAYER_RADIUS = 0.28;
const WALK_SPEED = 2.6;
const TURN_SPEED = 14;

export type Player = {
  group: THREE.Group;
  x: number;
  z: number;
  heading: number;
  walkPhase: number;
  moving: boolean;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  reducedMotion: boolean;
};

function limb(width: number, height: number, depth: number, color: number): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  geometry.translate(0, -height / 2, 0);
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: 0.95 }));
  mesh.castShadow = true;
  return mesh;
}

function block(width: number, height: number, depth: number, color: number): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color, roughness: 0.95 })
  );
  mesh.castShadow = true;
  return mesh;
}

export function buildPlayer(reducedMotion: boolean): Player {
  const group = new THREE.Group();

  const leftLeg = limb(0.11, 0.32, 0.13, 0x1c1a18);
  leftLeg.position.set(-0.08, 0.32, 0);
  const rightLeg = limb(0.11, 0.32, 0.13, 0x1c1a18);
  rightLeg.position.set(0.08, 0.32, 0);

  const torso = block(0.34, 0.42, 0.2, 0x2b2926);
  torso.position.y = 0.53;

  const leftArm = limb(0.09, 0.34, 0.11, 0x2b2926);
  leftArm.position.set(-0.215, 0.72, 0);
  const rightArm = limb(0.09, 0.34, 0.11, 0x2b2926);
  rightArm.position.set(0.215, 0.72, 0);

  const head = block(0.24, 0.22, 0.22, 0xc9b891);
  head.position.y = 0.86;
  const hair = block(0.26, 0.08, 0.24, 0x171310);
  hair.position.y = 0.99;

  group.add(leftLeg, rightLeg, torso, leftArm, rightArm, head, hair);

  return {
    group,
    x: 0.5,
    z: 2.4,
    heading: Math.PI,
    walkPhase: 0,
    moving: false,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    reducedMotion
  };
}

function collides(x: number, z: number, colliders: RectCollider[], bounds: RectCollider): boolean {
  if (x < bounds.minX || x > bounds.maxX || z < bounds.minZ || z > bounds.maxZ) {
    return true;
  }
  for (const box of colliders) {
    if (
      x + PLAYER_RADIUS > box.minX &&
      x - PLAYER_RADIUS < box.maxX &&
      z + PLAYER_RADIUS > box.minZ &&
      z - PLAYER_RADIUS < box.maxZ
    ) {
      return true;
    }
  }
  return false;
}

function shortestAngle(from: number, to: number): number {
  let delta = (to - from) % (Math.PI * 2);
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

export function updatePlayer(
  player: Player,
  inputX: number,
  inputZ: number,
  dt: number,
  colliders: RectCollider[],
  bounds: RectCollider
): void {
  const magnitude = Math.hypot(inputX, inputZ);
  player.moving = magnitude > 0.01;

  if (player.moving) {
    const nx = inputX / Math.max(1, magnitude);
    const nz = inputZ / Math.max(1, magnitude);
    const stepX = nx * WALK_SPEED * dt;
    const stepZ = nz * WALK_SPEED * dt;

    if (!collides(player.x + stepX, player.z, colliders, bounds)) {
      player.x += stepX;
    }
    if (!collides(player.x, player.z + stepZ, colliders, bounds)) {
      player.z += stepZ;
    }

    const target = Math.atan2(nx, nz);
    const turn = player.reducedMotion ? 1 : Math.min(1, TURN_SPEED * dt);
    player.heading += shortestAngle(player.heading, target) * turn;
    player.walkPhase += dt * 10;
  }

  const swing = player.moving && !player.reducedMotion ? Math.sin(player.walkPhase) : 0;
  player.leftLeg.rotation.x = swing * 0.55;
  player.rightLeg.rotation.x = -swing * 0.55;
  player.leftArm.rotation.x = -swing * 0.35;
  player.rightArm.rotation.x = swing * 0.35;

  const bob = player.moving && !player.reducedMotion ? Math.abs(Math.sin(player.walkPhase)) * 0.035 : 0;
  player.group.position.set(player.x, bob, player.z);
  player.group.rotation.y = player.heading;
}
