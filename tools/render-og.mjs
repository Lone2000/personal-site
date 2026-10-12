/* Render tools/og-source.html to public/og.png at 1200x630.
 *
 *   npm run dev            # in another terminal
 *   node tools/render-og.mjs
 *
 * The source is copied into public/ only for the duration of the render, so
 * the dev server resolves the Archivo font and the posters by absolute path,
 * and no stray _og.html is ever deployed.
 *
 * playwright-core is deliberately NOT a dependency of this site: it is heavy
 * and the host runs `npm install` on every deploy. Install it wherever you
 * like and point PLAYWRIGHT_CORE at it, or have it resolvable here:
 *
 *   npm i -g playwright-core && npx playwright install chromium
 *   PLAYWRIGHT_CORE=/path/to/node_modules/playwright-core node tools/render-og.mjs
 *
 * PW_CHROMIUM optionally pins the browser executable.
 */
import { copyFileSync, rmSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

async function loadChromium() {
  const override = process.env.PLAYWRIGHT_CORE;
  for (const spec of [override && pathToFileURL(join(override, "index.js")).href, "playwright-core"]) {
    if (!spec) continue;
    try {
      // playwright-core is CommonJS: by file URL the named export does not
      // always survive interop, so fall back to the default namespace
      const mod = await import(spec);
      const chromium = mod.chromium ?? mod.default?.chromium;
      if (chromium) return chromium;
    } catch { /* try the next */ }
  }
  throw new Error(
    "playwright-core not found. Install it and re-run, optionally with " +
    "PLAYWRIGHT_CORE=<path to node_modules/playwright-core>.",
  );
}
const chromium = await loadChromium();

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const staged = join(root, "public", "_og.html");
const out = join(root, "public", "og.png");
const BASE = process.env.OG_BASE ?? "http://127.0.0.1:5173";

copyFileSync(join(here, "og-source.html"), staged);
let browser;
try {
  browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM });
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });

  const failed = [];
  page.on("requestfailed", (r) => failed.push(r.url()));

  await page.goto(`${BASE}/_og.html`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);

  // a fallback face would silently change the whole card
  if (!(await page.evaluate(() => document.fonts.check('800 110px "Archivo Variable"')))) {
    throw new Error("Archivo did not load; refusing to render with a fallback font");
  }
  if (failed.length) throw new Error(`assets failed: ${failed.join(", ")}`);

  await page.screenshot({ path: out });
  console.log(`wrote ${out}`);
} finally {
  await browser?.close();
  rmSync(staged, { force: true });
}
