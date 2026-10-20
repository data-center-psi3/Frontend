import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { demo } from "../src/mocks/demo.ts";
// Synthetic responses are used only in this browser test, never in the application.
const browser = await chromium.launch({
  executablePath:
    process.env.BROWSER_EXECUTABLE_PATH ??
    (process.platform === "win32"
      ? "C:/Program Files/Google/Chrome/Application/chrome.exe"
      : undefined),
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await mkdir("artifacts", { recursive: true });
const collections = {
  "/data-centers": demo.centers,
  "/mapa": demo.points,
  "/indicadores-ambientais": demo.indicators,
  "/fontes": demo.sources,
  "/beneficios": demo.benefits,
  "/conteudos-pesquisa": demo.research,
};
try {
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api", "");
    const values = collections[path] ?? [];
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        path === "/dashboard"
          ? demo.dashboard
          : {
              content: values,
              page: {
                number: 0,
                size: 100,
                totalPages: values.length ? 1 : 0,
                totalElements: values.length,
              },
            },
      ),
    });
  });
  await page.goto(
    (process.env.PREVIEW_URL ?? "http://127.0.0.1:5174").replace(/\/$/, "") +
      "/#/dashboard",
  );
  await page.getByText("API local conectada", { exact: true }).waitFor();
  await page
    .getByRole("tab", { name: "Evolução histórica", exact: true })
    .click();
  await page.locator(".recharts-area-area").first().waitFor();
  assert.equal(await page.locator(".institution-mark").count(), 1);
  await page.locator(".distribution").scrollIntoViewIfNeeded();
  const ringPoint = await page
    .locator(".donut .recharts-pie-sector path")
    .nth(1)
    .evaluate((path) => {
      const box = path.getBoundingClientRect();
      for (let y = box.top + 4; y < box.bottom - 4; y += 4) {
        for (let x = box.left + 4; x < box.right - 4; x += 4) {
          if (document.elementFromPoint(x, y) === path) return { x, y };
        }
      }
      return null;
    });
  assert(ringPoint);
  await page.mouse.move(ringPoint.x, ringPoint.y);
  await page.locator(".donut .analytics-tooltip").waitFor();
  assert.equal(
    await page
      .locator(".donut .recharts-tooltip-wrapper")
      .evaluate((e) => getComputedStyle(e).zIndex),
    "10",
  );
  assert.equal(
    await page
      .locator(".donut-center")
      .evaluate((e) => getComputedStyle(e).zIndex),
    "1",
  );
  await page.locator(".distribution").screenshot({
    path: "artifacts/cobertura-tooltip-camadas.png",
    animations: "disabled",
  });
  await page.mouse.move(0, 0);
  assert((await page.locator("linearGradient").count()) > 0);
  await page.locator(".dashboard-analytics").screenshot({
    path: "artifacts/graficos-estilo-dados-ficticios.png",
    animations: "disabled",
  });
  const category = page.locator(".distribution-item").first();
  await category.focus();
  assert.equal(await category.getAttribute("aria-pressed"), "true");
  await page.getByLabel("Ativar tema escuro").click();
  await page.locator(".dashboard-analytics").screenshot({
    path: "artifacts/graficos-estilo-escuro-dados-ficticios.png",
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(
    () => document.documentElement.scrollWidth <= innerWidth,
  );
  assert.deepEqual(errors, []);
  console.log(
    "Chart style verified: gradient bars/areas, historical curve, donut focus/percentage, dark theme and mobile width. Synthetic test data only.",
  );
} finally {
  await browser.close();
}
