/**
 * Takes the README screenshots automatically (Playwright + Chromium).
 *
 * Prerequisites
 *   1. The app is running (npm run start:dev) and the sample data is loaded (npx ts-node src/seed.ts)
 *   2. npm install --no-save playwright && npx playwright install chromium
 *
 * Usage (PowerShell)
 *   $env:ADMIN_LOGIN="you@example.com"; $env:ADMIN_PASSWORD="your-password"; npm run screenshots
 *
 * Output: docs/screenshots/*.png  (1440x900)
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const LOGIN = process.env.ADMIN_LOGIN;
const PASSWORD = process.env.ADMIN_PASSWORD;
const OUT = 'docs/screenshots';

if (!LOGIN || !PASSWORD) {
  console.error('Set ADMIN_LOGIN and ADMIN_PASSWORD (the admin account) before running.');
  process.exit(1);
}

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
let page;

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  page = await context.newPage();

  const settle = async (ms = 1200) => {
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(ms);
  };
  const shot = async (name) => {
    await page.screenshot({ path: `${OUT}/${name}.png` });
    console.log('saved', `${OUT}/${name}.png`);
  };
  const go = async (hash) => {
    await page.evaluate((h) => { location.hash = h; }, hash);
    await settle();
  };
  const closeModal = async () => {
    await page.keyboard.press('Escape');
    await page.waitForSelector('#modal.show', { state: 'hidden' });
    await page.waitForTimeout(400);
  };

  // 1. Sign-in page (not authenticated yet)
  await page.goto(`${BASE}/#/login`);
  await page.waitForSelector('#login-form');
  await settle(500);
  await shot('login');

  // Sign in
  await page.fill('#login', LOGIN);
  await page.fill('#password', PASSWORD);
  await page.click('#login-form button[type="submit"]');

  // Either the nav bar appears (signed in) or an error toast does (wrong credentials).
  await page.waitForSelector('.topbar, .toast.text-bg-danger', { timeout: 15000 }).catch(() => null);
  if ((await page.locator('.topbar').count()) === 0) {
    const toast = page.locator('.toast.text-bg-danger .toast-body').first();
    const reason = (await toast.count()) ? await toast.innerText() : 'no answer from the app';
    throw new Error(`Sign-in failed: ${reason}. Check ADMIN_LOGIN / ADMIN_PASSWORD (the account you registered first).`);
  }

  await page.waitForSelector('#grid .book-open, #grid .empty', { timeout: 20000 });
  if ((await page.locator('.book-open').count()) === 0) {
    throw new Error('Signed in, but the catalog is empty. Load the sample data first: npx ts-node src/seed.ts');
  }

  // 2. Catalog grouped by category
  await settle(3000); // let the covers load
  await shot('catalog');

  // 3. Book details
  await page.locator('.book-open').first().click();
  await page.waitForSelector('#modal.show .modal-title');
  await settle(1500);
  await shot('book-detail');
  await closeModal();

  // 4. New-book form
  await page.click('[data-action="new-book"]');
  await page.waitForSelector('#book-form');
  await page.waitForTimeout(800);
  await shot('book-form');
  await closeModal();

  // Favorite four books so the favorites page is not empty
  for (let i = 0; i < 4; i++) {
    const btn = page.locator('.fav-btn:not(.on)').first();
    if (await btn.count() === 0) break;
    await btn.click();
    await page.waitForTimeout(500);
  }

  // 5. Categories
  await go('/categories');
  await page.waitForSelector('.cat-card');
  await settle(3000);
  await shot('categories');

  // 6. Authors with a search
  await go('/authors');
  await page.waitForSelector('.author-card');
  await page.fill('#a-q', 'al');
  await page.waitForTimeout(500);
  await shot('authors');

  // 7. Favorites (wait for the toasts to disappear first)
  await go('/favorites');
  await page.waitForSelector('#fav-grid .book');
  await page.waitForTimeout(4200);
  await settle(2000);
  await shot('favorites');

  // 8. Profile
  await go('/profile');
  await page.waitForSelector('.profile-card');
  await settle(500);
  await shot('profile');

  // 9. Statistics (admin)
  await go('/stats');
  await page.waitForSelector('canvas');
  await page.waitForTimeout(2000); // chart animation
  await shot('statistics');

  // 10. Swagger
  await page.goto(`${BASE}/api`);
  await page.waitForSelector('.swagger-ui');
  await settle(1500);
  await shot('swagger');

  console.log('\nDone. Check docs/screenshots, then commit them.');
} catch (err) {
  if (page) await page.screenshot({ path: 'scripts/debug-failure.png' }).catch(() => {});
  console.error('\n' + err.message + '\n(a debug screenshot was saved to scripts/debug-failure.png)');
  process.exitCode = 1;
} finally {
  await browser.close();
}
