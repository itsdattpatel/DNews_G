/**
 * frontend/src/__tests__/unit/spider-crawler.test.ts
 * Unit tests for Step 5: Procedural SpiderCrawler IK leg solver & gait kinematics.
 */
import { describe, it, expect } from 'vitest';
import {
  solveTwoJointIK,
  getHipPosition,
  getIdealFootPosition,
  updateLegStep,
  DEFAULT_LEG_CONFIGS,
} from '../../components/spider/SpiderLeg';
import type { SpiderLegState } from '../../components/spider/SpiderCrawler.types';

describe('Step 5: Procedural SpiderCrawler Kinematics', () => {
  describe('2-Joint Planar Inverse Kinematics (solveTwoJointIK)', () => {
    it('solves realistic knee positions for reachable foot targets', () => {
      const hipX = 100;
      const hipY = 100;
      const footX = 120;
      const footY = 100;
      const femur = 14;
      const tibia = 16;

      // Bend direction 1 (downward/right bend)
      const ikPositive = solveTwoJointIK(hipX, hipY, footX, footY, femur, tibia, 1);
      expect(Number.isFinite(ikPositive.jointX)).toBe(true);
      expect(Number.isFinite(ikPositive.jointY)).toBe(true);
      expect(ikPositive.jointY).toBeGreaterThan(hipY); // knee bent downwards

      // Bend direction -1 (upward/left bend)
      const ikNegative = solveTwoJointIK(hipX, hipY, footX, footY, femur, tibia, -1);
      expect(Number.isFinite(ikNegative.jointX)).toBe(true);
      expect(Number.isFinite(ikNegative.jointY)).toBe(true);
      expect(ikNegative.jointY).toBeLessThan(hipY); // knee bent upwards
    });

    it('gracefully handles and clamps targets outside maximum reach without NaN', () => {
      const hipX = 50;
      const hipY = 50;
      const distantFootX = 500;
      const distantFootY = 500;
      const femur = 12;
      const tibia = 14;

      const result = solveTwoJointIK(hipX, hipY, distantFootX, distantFootY, femur, tibia, 1);
      expect(Number.isNaN(result.jointX)).toBe(false);
      expect(Number.isNaN(result.jointY)).toBe(false);
      expect(Number.isFinite(result.jointX)).toBe(true);
      expect(Number.isFinite(result.jointY)).toBe(true);
    });
  });

  describe('Hip and Foot Target Layout', () => {
    it('configures 8 distinct legs with 4 on the left and 4 on the right', () => {
      expect(DEFAULT_LEG_CONFIGS).toHaveLength(8);

      const leftLegs = DEFAULT_LEG_CONFIGS.filter((c) => c.bendDirection === -1);
      const rightLegs = DEFAULT_LEG_CONFIGS.filter((c) => c.bendDirection === 1);

      expect(leftLegs).toHaveLength(4);
      expect(rightLegs).toHaveLength(4);
    });

    it('computes symmetric hip socket positions relative to body center', () => {
      const bodyX = 200;
      const bodyY = 200;
      const heading = 0; // facing right

      const frontLeft = getHipPosition(bodyX, bodyY, heading, DEFAULT_LEG_CONFIGS[0]);
      const frontRight = getHipPosition(bodyX, bodyY, heading, DEFAULT_LEG_CONFIGS[4]);

      expect(frontLeft.hipX).toBeLessThan(bodyX);
      expect(frontRight.hipX).toBeGreaterThan(bodyX);
      expect(frontLeft.hipY).toBe(frontRight.hipY);
    });

    it('computes ideal foot rest position offset from body', () => {
      const bodyX = 200;
      const bodyY = 200;
      const heading = 0;
      const foot = getIdealFootPosition(bodyX, bodyY, heading, DEFAULT_LEG_CONFIGS[0]);
      expect(foot.targetX).toBeLessThan(bodyX);
      expect(foot.targetY).toBeLessThan(bodyY);
    });
  });

  describe('Gait Coordinator & Stepping Lifecycle (updateLegStep)', () => {
    it('maintains planted state when foot is close to ideal target', () => {
      const config = DEFAULT_LEG_CONFIGS[0];
      const initialLeg: SpiderLegState = {
        targetX: 100,
        targetY: 100,
        currentX: 100,
        currentY: 100,
        jointX: 90,
        jointY: 90,
        planted: true,
        stepProgress: 1.0,
        stepFromX: 100,
        stepFromY: 100,
      };

      const updated = updateLegStep(
        initialLeg,
        102, // 2px distance
        101,
        80,
        80,
        config,
        true,
        0.016,
      );

      expect(updated.planted).toBe(true);
      expect(updated.currentX).toBe(100);
      expect(updated.currentY).toBe(100);
    });

    it('triggers stepping lifecycle when foot drifts beyond stride threshold', () => {
      const config = DEFAULT_LEG_CONFIGS[0];
      const initialLeg: SpiderLegState = {
        targetX: 100,
        targetY: 100,
        currentX: 100,
        currentY: 100,
        jointX: 90,
        jointY: 90,
        planted: true,
        stepProgress: 1.0,
        stepFromX: 100,
        stepFromY: 100,
      };

      // Ideal foot target moved 30px away
      const updated = updateLegStep(
        initialLeg,
        130,
        100,
        80,
        80,
        config,
        true, // canStepThisGroup = true
        0.016,
      );

      expect(updated.planted).toBe(false);
      expect(updated.stepProgress).toBeGreaterThanOrEqual(0);
      expect(updated.stepFromX).toBe(100);
    });
  });
});
