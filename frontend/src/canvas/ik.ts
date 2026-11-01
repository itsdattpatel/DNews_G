/**
 * frontend/src/canvas/ik.ts
 * 2-Segment Inverse Kinematics (IK) FABRIK / Analytical solver for spider legs.
 * Segment lengths: femur = 20px, tibia = 18px (Max reach = 38px).
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface JointChain {
  root: Point2D;
  knee: Point2D;
  foot: Point2D;
}

export interface LegState {
  index: number;
  side: 'left' | 'right';
  rootOffset: Point2D; // offset from spider body center
  defaultFootOffset: Point2D;
  currentFoot: Point2D;
  targetFoot: Point2D;
  liftProgress: number; // 0 (planted) to 1 (planted at new target)
  isStepping: boolean;
}

export const FEMUR_LENGTH = 20;
export const TIBIA_LENGTH = 18;
export const MAX_REACH = FEMUR_LENGTH + TIBIA_LENGTH; // 38px

/**
 * Solves 2-segment inverse kinematics for a leg.
 * @param root Attachment point on body
 * @param target Desired foot position
 * @param bendDir -1 for forward bend, +1 for backward bend
 */
export function solve2SegmentIK(
  root: Point2D,
  target: Point2D,
  bendDir: 1 | -1 = 1,
): JointChain {
  const dx = target.x - root.x;
  const dy = target.y - root.y;
  let dist = Math.sqrt(dx * dx + dy * dy);

  // Clamp distance if target exceeds max reach
  let footX = target.x;
  let footY = target.y;

  if (dist > MAX_REACH - 0.5) {
    const scale = (MAX_REACH - 0.5) / (dist || 1);
    footX = root.x + dx * scale;
    footY = root.y + dy * scale;
    dist = MAX_REACH - 0.5;
  }

  // Minimum reach to prevent degenerate zero-length math
  if (dist < 2) {
    dist = 2;
  }

  // Law of cosines for triangle with sides L1 (femur), L2 (tibia), dist
  const L1 = FEMUR_LENGTH;
  const L2 = TIBIA_LENGTH;

  // Cosine of angle at root joint between baseline and femur
  const cosAlpha = Math.max(-1, Math.min(1, (L1 * L1 + dist * dist - L2 * L2) / (2 * L1 * dist)));
  const alpha = Math.acos(cosAlpha);

  // Baseline angle from root to target
  const baseAngle = Math.atan2(dy, dx);

  // Knee angle
  const kneeAngle = baseAngle + bendDir * alpha;

  const kneeX = root.x + Math.cos(kneeAngle) * L1;
  const kneeY = root.y + Math.sin(kneeAngle) * L1;

  return {
    root: { x: root.x, y: root.y },
    knee: { x: kneeX, y: kneeY },
    foot: { x: footX, y: footY },
  };
}

/** Linear interpolation helper */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
