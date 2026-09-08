import { chromium } from 'playwright-core';
import pkg from 'gifenc';
const { GIFEncoder, quantize, applyPalette } = pkg;
import { PNG } from 'pngjs';
import path from 'path';
import fs from 'fs';

const TARGET_DIR = path.resolve('website/assets');
if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

async function run() {
  console.log('Launching browser to capture FlowGit assets & demo GIF...');
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true,
  });

  const width = 960;
  const height = 600;

  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();

  // 1. Initial Page Load
  await page.goto('http://127.0.0.1:1420', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  // Take high-res shots for marketing
  console.log('Taking high-res static screenshots...');
  await page.screenshot({ path: path.join(TARGET_DIR, 'flowgit_hero.png') });

  // Split Diff shot
  const splitBtn = page.locator('button').filter({ hasText: /^Split$/i }).first();
  if (await splitBtn.isVisible()) {
    await splitBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(TARGET_DIR, 'flowgit_diff_split.png') });
  }

  // Files / Explorer shot
  const moreBtn = page.locator('button').filter({ hasText: /More Views|Xem thêm|Khác/i }).first();
  if (await moreBtn.isVisible()) {
    await moreBtn.click();
    await page.waitForTimeout(300);
    const filesBtn = page.locator('button').filter({ hasText: /Files|Tệp tin|Explorer/i }).first();
    if (await filesBtn.isVisible()) {
      await filesBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(TARGET_DIR, 'flowgit_explorer.png') });
    }
  }

  // Now record animation frames for GIF
  console.log('Starting animation frame capture for flowgit_demo.gif...');
  const frames = [];

  async function snap(delayMs = 600) {
    const shot = await page.screenshot({ type: 'png' });
    frames.push({ buffer: shot, delay: delayMs });
  }

  // Scene 1: Fresh Graph view
  await page.goto('http://127.0.0.1:1420', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await snap(1200); // 1.2s on hero

  // Scene 2: Selecting commits
  const commitRows = page.locator('tr').filter({ hasText: /feat|fix|merge|update|chore|init/i });
  const rowCount = await commitRows.count();
  if (rowCount > 2) {
    await commitRows.nth(1).click();
    await page.waitForTimeout(400);
    await snap(900);
    await commitRows.nth(2).click();
    await page.waitForTimeout(400);
    await snap(900);
  }

  // Scene 3: Split Diff toggle
  const splitToggle = page.locator('button').filter({ hasText: /^Split$/i }).first();
  if (await splitToggle.isVisible()) {
    await splitToggle.click();
    await page.waitForTimeout(500);
    await snap(1500); // Admire split diff
    const unifiedToggle = page.locator('button').filter({ hasText: /^Unified$/i }).first();
    if (await unifiedToggle.isVisible()) {
      await unifiedToggle.click();
      await page.waitForTimeout(400);
      await snap(600);
    }
  }

  // Scene 4: Command Palette (Ctrl+K)
  await page.keyboard.press('Control+k');
  await page.waitForTimeout(400);
  await snap(600);
  await page.keyboard.type('rebase', { delay: 120 });
  await page.waitForTimeout(400);
  await snap(1400); // Admire filtered command palette
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await snap(400);

  // Scene 5: Safe Discard Trash (48h)
  const trashBtn = page.locator('button[title*="Trash"], button[aria-label*="Trash"]').first();
  if (await trashBtn.isVisible()) {
    await trashBtn.click({ force: true });
    await page.waitForTimeout(600);
    await snap(1600); // Admire safe trash
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    await snap(400);
  }

  // Scene 6: Time Machine (Ctrl+Z)
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(600);
  await snap(1600); // Admire time machine drawer
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await snap(800);

  await browser.close();

  console.log(`Captured ${frames.length} frames. Encoding GIF (${width}x${height})...`);
  const gif = GIFEncoder();

  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    console.log(`Processing frame ${i + 1}/${frames.length}...`);
    const png = PNG.sync.read(f.buffer);
    const palette = quantize(png.data, 256);
    const index = applyPalette(png.data, palette);
    gif.writeFrame(index, width, height, {
      palette,
      delay: f.delay,
    });
  }

  gif.finish();
  const outputBuffer = Buffer.from(gif.bytes());
  const outputPath = path.join(TARGET_DIR, 'flowgit_demo.gif');
  fs.writeFileSync(outputPath, outputBuffer);

  console.log(`GIF successfully generated at: ${outputPath} (${(outputBuffer.length / 1024 / 1024).toFixed(2)} MB)`);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
