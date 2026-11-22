/**
 * frontend/src/lib/trackingShield.ts
 * Zero-Tracking Shield (PRD Master Expansion #43).
 * Strips surveillance parameters, tracking pixels, and analytics referrers before opening or copying URLs.
 */

// Comprehensive registry of surveillance, analytics, ad-network, and click-tracking URL parameters
const STRIPPED_TRACKING_KEYS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'utm_reader',
  'utm_name',
  'fbclid',
  'gclid',
  'gclsrc',
  'dclid',
  'msclkid',
  'mc_eid',
  'mc_cid',
  '_hsenc',
  '_hsmi',
  'igshid',
  'ref',
  'referrer',
  'si',
  'spm',
  'wickedid',
  'oly_anon_id',
  'oly_enc_id',
  'rb_clickid',
  's_cid',
  'vero_conv',
  'vero_id',
  'yclid',
  '_ga',
  '_gl',
]);

/**
 * Sanitizes a URL by removing all query parameters associated with commercial surveillance and tracking.
 */
export function sanitizeUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  try {
    const parsed = new URL(rawUrl);
    const keysToDelete: string[] = [];

    parsed.searchParams.forEach((_, key) => {
      const lowerKey = key.toLowerCase();
      if (
        STRIPPED_TRACKING_KEYS.has(lowerKey) ||
        lowerKey.startsWith('utm_') ||
        lowerKey.startsWith('fb_') ||
        lowerKey.startsWith('ga_')
      ) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => parsed.searchParams.delete(key));

    // Remove hash-based tracking fragments (e.g., #xtor=...)
    if (parsed.hash && /#(xtor|utm|fbclid)=/i.test(parsed.hash)) {
      parsed.hash = '';
    }

    return parsed.toString();
  } catch {
    // If not a valid parseable absolute URL, return safely
    return rawUrl;
  }
}

/**
 * Copies a sanitized URL cleanly to the system clipboard without tracker telemetry.
 */
export async function copySanitizedUrl(rawUrl: string): Promise<boolean> {
  const cleanUrl = sanitizeUrl(rawUrl);
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(cleanUrl);
      return true;
    }
  } catch {
    // Fallback
  }
  return false;
}

/**
 * Opens a sanitized link in a fresh browsing context with complete isolation (noopener, noreferrer).
 */
export function openSanitizedUrl(rawUrl: string): void {
  const cleanUrl = sanitizeUrl(rawUrl);
  if (!cleanUrl) return;
  window.open(cleanUrl, '_blank', 'noopener,noreferrer');
}
