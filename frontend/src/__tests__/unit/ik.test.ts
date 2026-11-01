/**
 * frontend/src/__tests__/unit/ik.test.ts
 * Unit tests for 2-segment Inverse Kinematics (IK) solver and leg stepping.
 * Corresponds to test IDs T4-01, T4-02, T4-03 in docs/TEST_PLAN.md.
 */
import { describe, it, expect } from 'vitest';
import { solve2SegmentIK, lerp, FEMUR_LENGTH, TIBIA_LENGTH, MAX_REACH } from '../../canvas/ik';

describe('Inverse Kinematics (IK) Solver', () => {
  it('T4-01: target within reach returns foot position within 1px of target and valid knee', () => {
    const root = { x: 100, y: 100 };
    const target = { x: 120, y: 115 }; // dist = hypot(20, 15) = 25px (< 38px max reach)

    const chain = solve2SegmentIK(root, target, 1);

    // Root is preserved
    expect(chain.root.x).toBe(root.x);
    expect(chain.root.y).toBe(root.y);

    // Target is reached within 1px
    expect(Math.abs(chain.foot.x - target.x)).toBeLessThan(1.0);
    expect(Math.abs(chain.foot.y - target.y)).toBeLessThan(1.0);

    // Segment 1 (femur) length is exactly FEMUR_LENGTH (20px)
    const femurDist = Math.hypot(chain.knee.x - chain.root.x, chain.knee.y - chain.root.y);
    expect(Math.abs(femurDist - FEMUR_LENGTH)).toBeLessThan(0.01);

    // Segment 2 (tibia) length is exactly TIBIA_LENGTH (18px)
    const tibiaDist = Math.hypot(chain.foot.x - chain.knee.x, chain.foot.y - chain.knee.y);
    expect(Math.abs(tibiaDist - TIBIA_LENGTH)).toBeLessThan(0.01);

    // Knee bends forward or backward without NaN
    expect(Number.isNaN(chain.knee.x)).toBe(false);
    expect(Number.isNaN(chain.knee.y)).toBe(false);
  });

  it('T4-02: target out of reach clamps foot at max extension without NaN', () => {
    const root = { x: 50, y: 50 };
    const target = { x: 150, y: 150 }; // dist = hypot(100, 100) = 141.4px (>> 38px)

    const chain = solve2SegmentIK(root, target, 1);

    const actualReach = Math.hypot(chain.foot.x - root.x, chain.foot.y - root.y);

    // Must be clamped to near MAX_REACH (38px) and never exceed MAX_REACH
    expect(actualReach).toBeLessThanOrEqual(MAX_REACH);
    expect(actualReach).toBeGreaterThanOrEqual(MAX_REACH - 1.0);

    // No coordinates should be NaN
    expect(Number.isNaN(chain.root.x)).toBe(false);
    expect(Number.isNaN(chain.root.y)).toBe(false);
    expect(Number.isNaN(chain.knee.x)).toBe(false);
    expect(Number.isNaN(chain.knee.y)).toBe(false);
    expect(Number.isNaN(chain.foot.x)).toBe(false);
    expect(Number.isNaN(chain.foot.y)).toBe(false);
  });

  it('T4-03: Lerp convergence brings foot within 2px of target after 20 frames at dt=16ms', () => {
    let currentFoot = { x: 0, y: 0 };
    const targetFoot = { x: 30, y: 20 };

    const dt = 0.016; // 16ms frame
    let progress = 0;

    // Simulate stepping arc over 20 frames
    for (let frame = 0; frame < 20; frame++) {
      progress += dt * 4.5; // stepping rate in BaseSpider
      const clampedProgress = Math.min(1, progress);
      currentFoot.x = lerp(currentFoot.x, targetFoot.x, clampedProgress);
      currentFoot.y = lerp(currentFoot.y, targetFoot.y, clampedProgress);
    }

    const distToTarget = Math.hypot(targetFoot.x - currentFoot.x, targetFoot.y - currentFoot.y);
    expect(distToTarget).toBeLessThan(2.0);
  });
});
