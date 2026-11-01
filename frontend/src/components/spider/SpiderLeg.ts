/**
 * frontend/src/components/spider/SpiderLeg.ts
 * Procedural 2-joint Inverse Kinematics (IK) leg solver and insect gait coordinator.
 * Clean-room implementation based on analytical law-of-cosines geometry.
 */
import type { SpiderLegState } from './SpiderCrawler.types';

export interface LegConfig {
  hipOffsetX: number;   // Offset from body center along heading perpendicular
  hipOffsetY: number;   // Offset from body center along heading parallel
  femurLength: number;  // Upper leg segment (L1)
  tibiaLength: number;  // Lower leg segment (L2)
  bendDirection: 1 | -1;// 1 for outward/down, -1 for outward/up
  defaultReach: number; // Rest reach distance from hip
  restAngle: number;    // Rest angle relative to body heading
  gaitGroup: 0 | 1;     // Alternate stepping phases
}

export const DEFAULT_LEG_CONFIGS: LegConfig[] = [
  // Left side legs (0, 1, 2, 3) - from front to back
  { hipOffsetX: -5, hipOffsetY: -6, femurLength: 12, tibiaLength: 14, bendDirection: -1, defaultReach: 24, restAngle: -Math.PI * 0.75, gaitGroup: 0 },
  { hipOffsetX: -7, hipOffsetY: -2, femurLength: 13, tibiaLength: 15, bendDirection: -1, defaultReach: 26, restAngle: -Math.PI * 0.55, gaitGroup: 1 },
  { hipOffsetX: -7, hipOffsetY: 2,  femurLength: 13, tibiaLength: 15, bendDirection: -1, defaultReach: 26, restAngle: -Math.PI * 0.40, gaitGroup: 0 },
  { hipOffsetX: -5, hipOffsetY: 6,  femurLength: 14, tibiaLength: 16, bendDirection: -1, defaultReach: 28, restAngle: -Math.PI * 0.20, gaitGroup: 1 },

  // Right side legs (4, 5, 6, 7) - from front to back
  { hipOffsetX: 5,  hipOffsetY: -6, femurLength: 12, tibiaLength: 14, bendDirection: 1,  defaultReach: 24, restAngle: Math.PI * 0.75,  gaitGroup: 1 },
  { hipOffsetX: 7,  hipOffsetY: -2, femurLength: 13, tibiaLength: 15, bendDirection: 1,  defaultReach: 26, restAngle: Math.PI * 0.55,  gaitGroup: 0 },
  { hipOffsetX: 7,  hipOffsetY: 2,  femurLength: 13, tibiaLength: 15, bendDirection: 1,  defaultReach: 26, restAngle: Math.PI * 0.40,  gaitGroup: 1 },
  { hipOffsetX: 5,  hipOffsetY: 6,  femurLength: 14, tibiaLength: 16, bendDirection: 1,  defaultReach: 28, restAngle: Math.PI * 0.20,  gaitGroup: 0 },
];

/**
 * Solves 2-joint planar inverse kinematics for knee position.
 */
export function solveTwoJointIK(
  hipX: number,
  hipY: number,
  footX: number,
  footY: number,
  femur: number,
  tibia: number,
  bendDirection: 1 | -1,
): { jointX: number; jointY: number } {
  const dx = footX - hipX;
  const dy = footY - hipY;
  const distSq = dx * dx + dy * dy;
  const dist = Math.sqrt(distSq);

  // Maximum and minimum reachable extents
  const maxReach = femur + tibia - 0.001;
  const minReach = Math.max(0.001, Math.abs(femur - tibia) + 0.001);
  const clampedDist = Math.max(minReach, Math.min(maxReach, dist));

  // Base direction from hip to foot
  const baseAngle = Math.atan2(dy, dx);

  // Law of cosines: femur^2 + dist^2 - tibia^2 = 2 * femur * dist * cos(alpha)
  const cosAlpha = (femur * femur + clampedDist * clampedDist - tibia * tibia) / (2 * femur * clampedDist);
  const safeCosAlpha = Math.max(-1, Math.min(1, cosAlpha));
  const alpha = Math.acos(safeCosAlpha);

  const kneeAngle = baseAngle + bendDirection * alpha;
  const jointX = hipX + femur * Math.cos(kneeAngle);
  const jointY = hipY + femur * Math.sin(kneeAngle);

  return { jointX, jointY };
}

/**
 * Calculates world coordinates of a hip socket given body position and heading.
 */
export function getHipPosition(
  bodyX: number,
  bodyY: number,
  heading: number,
  config: LegConfig,
): { hipX: number; hipY: number } {
  const cos = Math.cos(heading);
  const sin = Math.sin(heading);

  // Rotate local offset by heading
  const worldOffsetX = config.hipOffsetX * cos - config.hipOffsetY * sin;
  const worldOffsetY = config.hipOffsetX * sin + config.hipOffsetY * cos;

  return {
    hipX: bodyX + worldOffsetX,
    hipY: bodyY + worldOffsetY,
  };
}

/**
 * Computes default target foot position for a leg in rest pose.
 */
export function getIdealFootPosition(
  bodyX: number,
  bodyY: number,
  heading: number,
  config: LegConfig,
): { targetX: number; targetY: number } {
  const { hipX, hipY } = getHipPosition(bodyX, bodyY, heading, config);
  const footAngle = heading + config.restAngle;

  return {
    targetX: hipX + config.defaultReach * Math.cos(footAngle),
    targetY: hipY + config.defaultReach * Math.sin(footAngle),
  };
}

/**
 * Updates a single leg state during movement.
 */
export function updateLegStep(
  leg: SpiderLegState,
  idealX: number,
  idealY: number,
  hipX: number,
  hipY: number,
  config: LegConfig,
  canStepThisGroup: boolean,
  dt: number,
  stepSpeed: number = 6.0,
): SpiderLegState {
  // Distance from current foot position to ideal position
  const dx = idealX - leg.currentX;
  const dy = idealY - leg.currentY;
  const distToIdeal = Math.sqrt(dx * dx + dy * dy);

  let newPlanted = leg.planted;
  let newProgress = leg.stepProgress;
  let newCurrentX = leg.currentX;
  let newCurrentY = leg.currentY;
  let newFromX = leg.stepFromX;
  let newFromY = leg.stepFromY;
  let newTargetX = leg.targetX;
  let newTargetY = leg.targetY;

  // If foot has drifted too far from ideal and leg's gait group is allowed to step
  if (leg.planted && distToIdeal > 18 && canStepThisGroup) {
    newPlanted = false;
    newProgress = 0;
    newFromX = leg.currentX;
    newFromY = leg.currentY;
    // Step ahead slightly along the velocity direction
    newTargetX = idealX + dx * 0.3;
    newTargetY = idealY + dy * 0.3;
  }

  // Stepping interpolation
  if (!newPlanted) {
    newProgress = Math.min(1.0, newProgress + dt * stepSpeed);
    const t = newProgress;
    // Smooth ease-in-out interpolation
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

    newCurrentX = newFromX + (newTargetX - newFromX) * ease;
    newCurrentY = newFromY + (newTargetY - newFromY) * ease;

    if (newProgress >= 1.0) {
      newPlanted = true;
      newProgress = 1.0;
      newCurrentX = newTargetX;
      newCurrentY = newTargetY;
    }
  }

  // Solve inverse kinematics for knee joint
  const { jointX, jointY } = solveTwoJointIK(
    hipX,
    hipY,
    newCurrentX,
    newCurrentY,
    config.femurLength,
    config.tibiaLength,
    config.bendDirection,
  );

  return {
    targetX: newTargetX,
    targetY: newTargetY,
    currentX: newCurrentX,
    currentY: newCurrentY,
    jointX,
    jointY,
    planted: newPlanted,
    stepProgress: newProgress,
    stepFromX: newFromX,
    stepFromY: newFromY,
  };
}

