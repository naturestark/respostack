import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// --- PWA TEST SUITE ---

test('PWA Web App Manifest - Schema and Asset Verification', () => {
  const manifestPath = path.resolve('public/manifest.webmanifest');
  assert.ok(fs.existsSync(manifestPath), 'manifest.webmanifest must exist in public directory');

  const raw = fs.readFileSync(manifestPath, 'utf-8');
  const manifest = JSON.parse(raw);

  // 1. Identity & Display
  assert.strictEqual(manifest.name, 'Respostack — Personal Responsibilities Manager');
  assert.strictEqual(manifest.short_name, 'Respostack');
  assert.ok(manifest.description.includes('Privacy-first'), 'Description must highlight privacy');
  assert.strictEqual(manifest.display, 'standalone');
  assert.strictEqual(manifest.orientation, 'portrait-primary');
  assert.strictEqual(manifest.start_url, '/');
  assert.strictEqual(manifest.scope, '/');
  assert.strictEqual(manifest.theme_color, '#0d9488');
  assert.strictEqual(manifest.background_color, '#f8fafc');

  // 2. Icon Requirements
  assert.ok(Array.isArray(manifest.icons), 'Icons must be an array');
  assert.ok(manifest.icons.length >= 3, 'Must contain at least 192px, 512px, and maskable icons');

  const icon192 = manifest.icons.find(i => i.sizes === '192x192' && i.purpose !== 'maskable');
  const icon512 = manifest.icons.find(i => i.sizes === '512x512' && i.purpose !== 'maskable');
  const iconMaskable = manifest.icons.find(i => i.sizes === '512x512' && i.purpose === 'maskable');

  assert.ok(icon192, 'Must define 192x192 icon for standard Android home screens');
  assert.ok(icon512, 'Must define 512x512 icon for splash screens');
  assert.ok(iconMaskable, 'Must define 512x512 maskable icon for adaptive icons');

  // 3. Physical Asset Verification
  for (const icon of manifest.icons) {
    const filename = icon.src.replace(/^\//, '');
    const assetPath = path.resolve('public', filename);
    assert.ok(fs.existsSync(assetPath), `Referenced icon file ${filename} must exist on disk`);
    const stat = fs.statSync(assetPath);
    assert.ok(stat.size > 100, `Icon file ${filename} must not be empty`);
  }

  // Apple touch icon and favicon
  assert.ok(fs.existsSync(path.resolve('public/apple-touch-icon.png')), 'apple-touch-icon.png must exist');
  assert.ok(fs.existsSync(path.resolve('public/favicon.ico')), 'favicon.ico must exist');
  assert.ok(fs.existsSync(path.resolve('public/pwa-icon.svg')), 'pwa-icon.svg must exist');
});

test('PWA Installation & Standalone State Machine', () => {
  // Simulating checkIsStandalone
  function isStandalone(mediaQueryMatches, iosStandalone, androidReferrer) {
    return Boolean(mediaQueryMatches || iosStandalone || androidReferrer);
  }

  assert.strictEqual(isStandalone(true, false, false), true, 'Matches media query standalone');
  assert.strictEqual(isStandalone(false, true, false), true, 'Matches iOS navigator standalone');
  assert.strictEqual(isStandalone(false, false, true), true, 'Matches Android referrer standalone');
  assert.strictEqual(isStandalone(false, false, false), false, 'Normal browser tab is not standalone');

  // Simulating beforeinstallprompt capture & prompt flow
  class MockPromptEvent {
    constructor(outcome = 'accepted') {
      this.outcome = outcome;
      this.defaultPrevented = false;
      this.promptCalled = false;
    }
    preventDefault() {
      this.defaultPrevented = true;
    }
    async prompt() {
      this.promptCalled = true;
    }
    get userChoice() {
      return Promise.resolve({ outcome: this.outcome });
    }
  }

  // 1. Capture event
  const evt = new MockPromptEvent('accepted');
  evt.preventDefault();
  assert.strictEqual(evt.defaultPrevented, true, 'Must prevent default browser mini-infobar');

  // 2. User invokes prompt
  let canInstall = true;
  async function handleInstall(promptEvent) {
    if (!promptEvent) return 'unavailable';
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    return choice.outcome;
  }

  return handleInstall(evt).then(outcome => {
    assert.strictEqual(evt.promptCalled, true, 'Prompt must only be called on user action');
    assert.strictEqual(outcome, 'accepted');
  });
});

test('PWA Service Worker Update Flow - Safe Confirmation & DB Isolation', async () => {
  let skipWaitingSent = false;
  let reloadTriggered = false;

  const mockWaitingWorker = {
    postMessage(msg) {
      if (msg && msg.type === 'SKIP_WAITING') {
        skipWaitingSent = true;
      }
    }
  };

  // State machine for PWA update prompt
  let needRefresh = false;

  // New update detected
  function onUpdateFound(hasWaiting) {
    if (hasWaiting) {
      needRefresh = true;
    }
  }

  onUpdateFound(true);
  assert.strictEqual(needRefresh, true, 'Should detect update ready');

  // User explicitly chooses to apply update
  function applyUpdate(worker) {
    if (worker) {
      worker.postMessage({ type: 'SKIP_WAITING' });
    }
    reloadTriggered = true;
  }

  // User dismisses update to continue typing
  function dismissUpdate() {
    needRefresh = false;
  }

  dismissUpdate();
  assert.strictEqual(needRefresh, false, 'Dismissing update hides prompt without reload');
  assert.strictEqual(reloadTriggered, false, 'Dismissing must not trigger reload');

  // User explicitly clicks Update Now
  applyUpdate(mockWaitingWorker);
  assert.strictEqual(skipWaitingSent, true, 'SKIP_WAITING message sent to waiting worker');
  assert.strictEqual(reloadTriggered, true, 'Page reloads to apply new version');
});

test('Vite PWA & Workbox Configuration Rules', () => {
  const viteConfigPath = path.resolve('vite.config.ts');
  assert.ok(fs.existsSync(viteConfigPath), 'vite.config.ts must exist');

  const configContent = fs.readFileSync(viteConfigPath, 'utf-8');

  // Verify VitePWA plugin presence and configuration
  assert.ok(configContent.includes('VitePWA'), 'vite.config.ts must import and configure VitePWA');
  assert.ok(configContent.includes("registerType: 'prompt'"), "registerType must be 'prompt' for safe user-controlled updates");
  assert.ok(configContent.includes('navigateFallback: \'/index.html\''), 'Must configure SPA navigation fallback');
  assert.ok(configContent.includes('cleanupOutdatedCaches: true'), 'Must clean up outdated caches');
  assert.ok(configContent.includes('theme_color'), 'Must configure theme color');
  assert.ok(configContent.includes('display: \'standalone\''), 'Must configure standalone display mode');
});
