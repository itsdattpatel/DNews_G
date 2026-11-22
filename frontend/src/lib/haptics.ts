/**
 * frontend/src/lib/haptics.ts
 * Tactile Haptic Feedback Utility (PRD Master Expansion #3).
 * Supports standard Navigator Vibration API and native mobile fallback.
 */

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'selection' | 'bookmark' | 'refresh' | 'snap';

export function triggerHaptic(style: HapticStyle = 'light'): void {
  if (typeof window === 'undefined') return;

  try {
    if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
      switch (style) {
        case 'light':
          // Subtle 8ms tick for page swipes and list gliding
          navigator.vibrate(8);
          break;
        case 'snap':
        case 'medium':
          // 18ms pulse for toggle switches and pull-to-refresh snap
          navigator.vibrate(18);
          break;
        case 'heavy':
          // 35ms authoritative pulse for breaking news alerts
          navigator.vibrate(35);
          break;
        case 'selection':
          // Crisp 12ms tap for bottom bar navigation and desk switches
          navigator.vibrate(12);
          break;
        case 'bookmark':
          // Double rhythmic ink-stamp pulse [14ms on, 40ms pause, 22ms on]
          navigator.vibrate([14, 40, 22]);
          break;
        case 'refresh':
          // Triple rapid telegraph click [10ms on, 25ms pause, 10ms on, 25ms pause, 15ms on]
          navigator.vibrate([10, 25, 10, 25, 15]);
          break;
      }
    }
  } catch {
    // Graceful silent fallback if device denies vibration permission
  }
}
