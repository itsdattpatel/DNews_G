/**
 * frontend/src/components/spider/SpiderCrawler.types.ts
 * Strongly-typed data structures for procedural spider kinematics and anchor navigation.
 * Conforms to SPIDER_SPEC.md Section 2.2.
 */
import React from 'react';

export type SpiderMode = 'reading' | 'breaking' | 'compare' | 'archive';

export interface AnchorPhrase {
  phrase: string;          // verbatim substring of body_english
  sentence_index: number;  // 0-based index into summary sentences
}

export interface SpiderLegState {
  targetX: number;
  targetY: number;
  currentX: number;
  currentY: number;
  jointX: number;
  jointY: number;
  planted: boolean;
  stepProgress: number;    // 0 to 1
  stepFromX: number;
  stepFromY: number;
}

export interface SpiderBodyState {
  x: number;
  y: number;
  heading: number;         // radians
  legStates: SpiderLegState[]; // 8 procedural legs
}

export interface PhraseTarget {
  phrase: string;
  sentenceIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  visited: boolean;
}

export interface SpiderCrawlerProps {
  containerRef: React.RefObject<HTMLElement | null>;
  anchorPhrases: AnchorPhrase[];
  summaryCount?: number;
  mode?: SpiderMode;
  onPhraseActivate?: (sentenceIndex: number) => void;
  onPhraseLand?: (phrase: string, sentenceIndex: number) => void;
  paused?: boolean;
  spiderSpeed?: number;
  maxSpiders?: number;
  reducedMotion?: boolean;
}

