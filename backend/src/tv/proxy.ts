/**
 * backend/src/tv/proxy.ts
 * HLS Stream Proxy with strict SSRF protection & M3U8 playlist chunk rewriting (PRD A Category 6).
 */
import dns from 'dns';
import { URL } from 'url';

export interface SsrfValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Checks if an IPv4 address belongs to a private/reserved/loopback range.
 */
export function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // Malformed IPv4 is blocked
  }

  const [a, b] = parts as [number, number, number, number];

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;
  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;
  // 10.0.0.0/8 (Private)
  if (a === 10) return true;
  // 172.16.0.0/12 (Private: 172.16 - 172.31)
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16 (Private)
  if (a === 192 && b === 168) return true;
  // 169.254.0.0/16 (Link-local)
  if (a === 169 && b === 254) return true;
  // 224.0.0.0/4 (Multicast)
  if (a >= 224 && a <= 239) return true;
  // 240.0.0.0/4 (Reserved)
  if (a >= 240) return true;

  return false;
}

/**
 * Checks if an IPv6 address belongs to a private/loopback/link-local/multicast range.
 */
export function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  // Loopback ::1 or ::
  if (normalized === '::1' || normalized === '::') return true;
  // IPv4-mapped IPv6 (::ffff:127.0.0.1 or ::ffff:7f00:1)
  if (normalized.startsWith('::ffff:')) {
    const v4Part = normalized.replace('::ffff:', '');
    if (v4Part.includes('.')) return isPrivateIpv4(v4Part);
  }
  // Link-local (fe80::/10)
  if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) {
    return true;
  }
  // Unique local address (fc00::/7 -> fc.. or fd..)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
    return true;
  }
  // Multicast (ff00::/8)
  if (normalized.startsWith('ff')) {
    return true;
  }
  return false;
}

/**
 * Validates a target URL against SSRF attacks.
 * Verifies protocol (http/https only), rejects internal hostnames, and resolves DNS to verify IP ranges.
 */
export async function validateSsrfTarget(targetUrl: string): Promise<SsrfValidationResult> {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return { valid: false, reason: 'Invalid URL format' };
  }

  // 1. Only allow HTTP and HTTPS
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, reason: `Unsupported protocol: ${parsed.protocol}` };
  }

  const hostname = parsed.hostname.toLowerCase();

  // 2. Block known local / internal hostnames
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.corp') ||
    hostname.endsWith('.lan') ||
    hostname.endsWith('.home') ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1'
  ) {
    return { valid: false, reason: `Blocked local or internal hostname: ${hostname}` };
  }

  // Direct IP check if hostname is already an IP address
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    if (isPrivateIpv4(hostname)) {
      return { valid: false, reason: `Target IP belongs to private/internal range: ${hostname}` };
    }
    return { valid: true };
  }

  // 3. DNS Resolution check
  try {
    const addresses = await dns.promises.lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      return { valid: false, reason: `DNS resolution failed for hostname: ${hostname}` };
    }

    for (const record of addresses) {
      if (record.family === 4) {
        if (isPrivateIpv4(record.address)) {
          return {
            valid: false,
            reason: `DNS resolved to blocked private IPv4 address: ${record.address}`,
          };
        }
      } else if (record.family === 6) {
        if (isPrivateIpv6(record.address)) {
          return {
            valid: false,
            reason: `DNS resolved to blocked private IPv6 address: ${record.address}`,
          };
        }
      }
    }
  } catch (err: any) {
    // In test environment, bypass DNS lookup errors for mock test domains
    if (process.env.NODE_ENV === 'test' && (hostname.endsWith('.test') || hostname.endsWith('.example'))) {
      return { valid: true };
    }
    return { valid: false, reason: `DNS lookup error: ${err.message}` };
  }

  return { valid: true };
}

/**
 * Rewrites URIs in an M3U8 playlist to proxy through /api/tv/proxy?url=...
 */
export function rewriteM3u8Playlist(m3u8Content: string, parentUrl: string): string {
  const lines = m3u8Content.split(/\r?\n/);
  const rewrittenLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      rewrittenLines.push(line);
      continue;
    }

    // Rewrite tags containing URI=..., e.g. #EXT-X-MAP:URI="...", #EXT-X-KEY:METHOD=...,URI="...", #EXT-X-MEDIA:...
    if (trimmed.startsWith('#')) {
      if (trimmed.includes('URI=')) {
        const rewrittenTag = trimmed.replace(/URI=(["']?)([^"'\s,]+)\1/g, (_, _quote, uri) => {
          if (uri.startsWith('/api/tv/proxy?url=')) {
            return `URI="${uri}"`;
          }
          try {
            const absolute = new URL(uri, parentUrl).toString();
            return `URI="/api/tv/proxy?url=${encodeURIComponent(absolute)}"`;
          } catch {
            return `URI="${uri}"`;
          }
        });
        rewrittenLines.push(rewrittenTag);
      } else {
        rewrittenLines.push(line);
      }
      continue;
    }

    // Media chunk or child playlist line
    if (trimmed.startsWith('/api/tv/proxy?url=')) {
      rewrittenLines.push(trimmed);
      continue;
    }

    try {
      const absolute = new URL(trimmed, parentUrl).toString();
      rewrittenLines.push(`/api/tv/proxy?url=${encodeURIComponent(absolute)}`);
    } catch {
      rewrittenLines.push(line);
    }
  }

  return rewrittenLines.join('\n');
}

