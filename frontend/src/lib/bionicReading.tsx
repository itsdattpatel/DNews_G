/**
 * frontend/src/lib/bionicReading.tsx
 * Bionic Speed-Reading Formatter (PRD Master Expansion #10).
 * Bolds initial fixation anchors of words for high-speed broadsheet comprehension.
 */
import React from 'react';

/**
 * Calculates how many leading characters of a word should receive bold fixation.
 */
function getFixationLength(len: number): number {
  if (len <= 1) return 1;
  if (len <= 3) return 1;
  if (len <= 5) return 2;
  if (len <= 8) return 3;
  return Math.ceil(len * 0.45);
}

/**
 * Transforms a single plain text string into an array of React elements with bionic fixation stems.
 */
export function renderBionicText(text: string): React.ReactNode {
  if (!text) return text;

  // Split text by whitespace while preserving punctuation
  const words = text.split(/(\s+)/);

  return words.map((word, idx) => {
    // If it's pure whitespace, preserve as is
    if (/^\s+$/.test(word)) {
      return word;
    }

    // Match leading punctuation, alphanumeric word body, and trailing punctuation
    const match = word.match(/^([^a-zA-Z0-9]*)([a-zA-Z0-9]+)([^a-zA-Z0-9]*)$/);
    if (!match) {
      return word;
    }

    const [, leadingPunct, body, trailingPunct] = match;
    const fixLen = getFixationLength(body.length);
    const boldStem = body.slice(0, fixLen);
    const rest = body.slice(fixLen);

    return (
      <React.Fragment key={idx}>
        {leadingPunct}
        <b className="bionic-stem font-bold tracking-tight text-ink font-serif drop-shadow-2xs">{boldStem}</b>
        {rest}
        {trailingPunct}
      </React.Fragment>
    );
  });
}
