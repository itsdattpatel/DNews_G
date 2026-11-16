/**
 * backend/src/__tests__/unit/nsis-installer.test.ts
 * Unit tests for Windows NSIS Installer Packaging (PRD E Category 10).
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Windows NSIS Installer Packaging (PRD E Category 10)', () => {
  const rootDir = path.resolve(__dirname, '../../../../');
  const releaseDir = path.join(rootDir, 'release');
  const installerPath = path.join(releaseDir, 'DNews Setup 1.0.0.exe');
  const latestYmlPath = path.join(releaseDir, 'latest.yml');
  const unpackedExePath = path.join(releaseDir, 'win-unpacked', 'DNews.exe');

  it('generates the standalone NSIS installer executable (DNews Setup 1.0.0.exe)', () => {
    expect(fs.existsSync(installerPath)).toBe(true);
    const stats = fs.statSync(installerPath);
    // Installer should be greater than 50MB (contains Electron runtime + Chromium + Node + all assets)
    expect(stats.size).toBeGreaterThan(50 * 1024 * 1024);

    // Verify Windows Portable Executable (PE) header: MZ (0x4D 0x5A)
    const buffer = Buffer.alloc(2);
    const fd = fs.openSync(installerPath, 'r');
    fs.readSync(fd, buffer, 0, 2, 0);
    fs.closeSync(fd);

    expect(buffer[0]).toBe(0x4d); // 'M'
    expect(buffer[1]).toBe(0x5a); // 'Z'
  });

  it('generates latest.yml release manifest for electron-updater GitHub release matching', () => {
    expect(fs.existsSync(latestYmlPath)).toBe(true);
    const content = fs.readFileSync(latestYmlPath, 'utf-8');

    expect(content).toContain('version: 1.0.0');
    expect(content).toContain('DNews-Setup-1.0.0.exe');
    expect(content).toContain('sha512');
    expect(content).toContain('releaseDate');
  });

  it('produces unpacked Windows desktop binary with valid PE header', () => {
    expect(fs.existsSync(unpackedExePath)).toBe(true);
    const stats = fs.statSync(unpackedExePath);
    expect(stats.size).toBeGreaterThan(100 * 1024 * 1024);

    const buffer = Buffer.alloc(2);
    const fd = fs.openSync(unpackedExePath, 'r');
    fs.readSync(fd, buffer, 0, 2, 0);
    fs.closeSync(fd);

    expect(buffer[0]).toBe(0x4d); // 'M'
    expect(buffer[1]).toBe(0x5a); // 'Z'
  });
});
