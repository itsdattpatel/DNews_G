/**
 * backend/src/security/proxyManager.ts
 * SOCKS5 & Tor Anonymous Proxy Routing for Censored Jurisdictions (PRD Master Expansion #46).
 */
import { getDb } from '../db/db';

export interface ProxyConfig {
  enabled: boolean;
  host: string;
  port: number;
  torRouting: boolean;
  protocol: 'socks5' | 'http';
}

const DEFAULT_PROXY_CONFIG: ProxyConfig = {
  enabled: false,
  host: '127.0.0.1',
  port: 9050, // Standard Tor SOCKS5 default port
  torRouting: false,
  protocol: 'socks5',
};

export function getProxyConfig(): ProxyConfig {
  const db = getDb();
  try {
    const row = db.prepare("SELECT value FROM settings WHERE key = 'security_proxy_config'").get() as { value?: string } | undefined;
    if (row?.value) {
      return { ...DEFAULT_PROXY_CONFIG, ...JSON.parse(row.value) };
    }
  } catch {
    // fallback
  }
  return DEFAULT_PROXY_CONFIG;
}

export function updateProxyConfig(updates: Partial<ProxyConfig>): ProxyConfig {
  const db = getDb();
  const current = getProxyConfig();
  const merged: ProxyConfig = { ...current, ...updates };

  db.prepare(`
    INSERT INTO settings (key, value)
    VALUES ('security_proxy_config', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(JSON.stringify(merged));

  return merged;
}
