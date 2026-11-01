import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

// Import generators from scripts/
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { generateWindowsAutostart } = require('../../../../scripts/autostart-windows.js');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { generateMacAutostart } = require('../../../../scripts/autostart-mac.js');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { generateLinuxAutostart } = require('../../../../scripts/autostart-linux.js');

describe('Cross-Platform Autostart Generators (P5-06, P5-07, P5-08)', () => {
  it('generates a valid Windows Task Scheduler XML (P5-06)', () => {
    const xmlPath = generateWindowsAutostart();
    expect(fs.existsSync(xmlPath)).toBe(true);

    const content = fs.readFileSync(xmlPath, 'utf8');
    expect(content).toContain('<Task version="1.2"');
    expect(content).toContain('<LogonTrigger>');
    expect(content).toContain('<URI>\\AIWorldNewsDesk</URI>');
    expect(content).toContain('<Command>cmd.exe</Command>');
    expect(content).toContain('npm run dev');
  });

  it('generates a valid macOS launchd plist (P5-07)', () => {
    const plistPath = generateMacAutostart();
    expect(fs.existsSync(plistPath)).toBe(true);

    const content = fs.readFileSync(plistPath, 'utf8');
    expect(content).toContain('<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"');
    expect(content).toContain('<string>com.aiworldnewsdesk.app</string>');
    expect(content).toContain('<key>RunAtLoad</key>');
    expect(content).toContain('<true/>');
    expect(content).toContain('<string>npm run dev</string>');
  });

  it('generates a valid Linux systemd user service unit (P5-08)', () => {
    const servicePath = generateLinuxAutostart();
    expect(fs.existsSync(servicePath)).toBe(true);

    const content = fs.readFileSync(servicePath, 'utf8');
    expect(content).toContain('[Unit]');
    expect(content).toContain('Description=AI World News Desk');
    expect(content).toContain('[Service]');
    expect(content).toContain('ExecStart=/bin/sh -c "npm run dev"');
    expect(content).toContain('[Install]');
    expect(content).toContain('WantedBy=default.target');
  });
});
