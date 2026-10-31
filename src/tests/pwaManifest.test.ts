import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('PWA Web App Manifest Configuration', () => {
  const manifestPath = path.resolve(process.cwd(), 'public/manifest.webmanifest');

  it('contains a valid, readable web app manifest file', () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
    const content = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(content);

    expect(manifest.name).toBe('Respostack — Personal Responsibilities Manager');
    expect(manifest.short_name).toBe('Respostack');
    expect(manifest.description).toContain('Privacy-first');
    expect(manifest.display).toBe('standalone');
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    expect(manifest.theme_color).toBe('#0d9488');
    expect(manifest.background_color).toBe('#f8fafc');
  });

  it('specifies all required icon sizes and purposes', () => {
    const content = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(content);

    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(3);

    const icon192 = manifest.icons.find((i: { sizes: string; purpose?: string }) => i.sizes === '192x192');
    const icon512 = manifest.icons.find((i: { sizes: string; purpose?: string }) => i.sizes === '512x512' && i.purpose !== 'maskable');
    const maskable512 = manifest.icons.find((i: { sizes: string; purpose?: string }) => i.sizes === '512x512' && i.purpose === 'maskable');

    expect(icon192).toBeDefined();
    expect(icon512).toBeDefined();
    expect(maskable512).toBeDefined();
  });

  it('verifies that every icon file referenced in the manifest physically exists', () => {
    const content = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(content);

    for (const icon of manifest.icons) {
      // Remove leading slash to resolve relative to public/
      const cleanPath = icon.src.replace(/^\//, '');
      const fullPath = path.resolve(process.cwd(), 'public', cleanPath);
      expect(fs.existsSync(fullPath)).toBe(true);
      const stat = fs.statSync(fullPath);
      expect(stat.size).toBeGreaterThan(0);
    }
  });
});
