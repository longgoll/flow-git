import { chromium } from 'playwright-core';
import path from 'path';
import fs from 'fs';

const TARGET_DIR = path.resolve('website/assets');
if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

async function run() {
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  // 1. Hero Screenshot: Living Graph + Unified Diff
  console.log('Capturing Hero Main Graph (flowgit_hero.png)...');
  await page.goto('http://127.0.0.1:1420', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(TARGET_DIR, 'flowgit_hero.png') });

  // 2. Diff Split Mode
  console.log('Capturing Split Diff View (flowgit_diff_split.png)...');
  const splitBtn = page.locator('button').filter({ hasText: /^Split$/i });
  if (await splitBtn.isVisible()) {
    await splitBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(TARGET_DIR, 'flowgit_diff_split.png') });
  }

  // 3. Command Palette
  console.log('Capturing Command Palette (flowgit_palette.png)...');
  await page.goto('http://127.0.0.1:1420', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.keyboard.press('Control+k');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(TARGET_DIR, 'flowgit_palette.png') });

  // 4. Safe Trash Modal
  console.log('Capturing Safe Discard Trash (flowgit_trash.png)...');
  await page.goto('http://127.0.0.1:1420', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const trashBtn = page.locator('button[title*="Trash"]');
  if (await trashBtn.isVisible()) {
    await trashBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(TARGET_DIR, 'flowgit_trash.png') });
  }

  // 5. Conflicts View
  console.log('Capturing Conflicts Screen (flowgit_conflicts.png)...');
  await page.goto('http://127.0.0.1:1420', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const conflictBtn = page.locator('button').filter({ hasText: /Conflicts/i }).first();
  if (await conflictBtn.isVisible()) {
    await conflictBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(TARGET_DIR, 'flowgit_conflicts.png') });
  }

  // 6. Time Machine Drawer (Ctrl+Z)
  console.log('Capturing Time Machine Drawer (flowgit_timemachine.png)...');
  await page.goto('http://127.0.0.1:1420', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(TARGET_DIR, 'flowgit_timemachine.png') });

  await browser.close();
  console.log('All shots captured perfectly!');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
