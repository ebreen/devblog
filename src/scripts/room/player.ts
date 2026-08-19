import type { RectCollider } from "./world";

export const PLAYER_RADIUS = 0.28;
export const EYE_HEIGHT = 1.58;
const WALK_SPEED = 2.8;
const PITCH_MIN = -1.15;
const PITCH_MAX = 1.15;
const LOOK_SENSITIVITY = 0.0022;

export type Player = {
  x: number;
  z: number;
  yaw: number;
  pitch: number;
};

export function createPlayer(): Player {
  return {
    x: 1.05,
    z: 1.9,
    yaw: -0.15,
    pitch: 0.03
  };
}

export function lookPlayer(player: Player, movementX: number, movementY: number): void {
  player.yaw -= movementX * LOOK_SENSITIVITY;
  player.pitch = Math.min(PITCH_MAX, Math.max(PITCH_MIN, player.pitch - movementY * LOOK_SENSITIVITY));
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

export function updatePlayer(
  player: Player,
  strafe: number,
  forward: number,
  dt: number,
  colliders: RectCollider[],
  bounds: RectCollider
): void {
  const magnitude = Math.hypot(strafe, forward);
  if (magnitude <= 0.01) {
    return;
  }

  const nx = strafe / magnitude;
  const nz = forward / magnitude;
  const lookX = -Math.sin(player.yaw);
  const lookZ = -Math.cos(player.yaw);
  const rightX = Math.cos(player.yaw);
  const rightZ = -Math.sin(player.yaw);
  const stepX = (rightX * nx + lookX * nz) * WALK_SPEED * dt;
  const stepZ = (rightZ * nx + lookZ * nz) * WALK_SPEED * dt;

  if (!collides(player.x + stepX, player.z, colliders, bounds)) {
    player.x += stepX;
  }
  if (!collides(player.x, player.z + stepZ, colliders, bounds)) {
    player.z += stepZ;
  }
}
