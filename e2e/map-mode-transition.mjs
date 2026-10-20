import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath:
    process.env.BROWSER_EXECUTABLE_PATH ??
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
const errors = [],
  calls = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("request", (request) => {
  if (request.url().includes("/api/")) calls.push(request.url());
});
let releaseData;
const dataGate = new Promise((resolve) => {
  releaseData = resolve;
});
await page.route("**/api/data-centers?**", async (route) => {
  await dataGate;
  await route.continue();
});
try {
  await page.goto(
    `${process.env.PREVIEW_URL ?? "http://127.0.0.1:5173"}/#/mapa?mode=radar&view=states&metric=networks&uf=SP`,
  );
  await page.waitForFunction(
    () => document.querySelector(".radar-kpi strong")?.textContent === "112",
    { timeout: 45000 },
  );
  const chart = page.locator(".radar-charts > .panel").first();
  await chart
    .getByRole("button", { name: /^Abrir operadores de / })
    .first()
    .click();
  await chart
    .getByRole("button", { name: /^Abrir instalações do operador / })
    .first()
    .click();
  const title = await chart.locator("h2").textContent();
  await page.locator(".radar-map-canvas .leaflet-control-zoom-in").click();
  const pin = page.getByRole("button", {
    name: "Voltar ao mapa de localizações",
    exact: true,
  });
  await pin.scrollIntoViewIfNeeded();
  await page
    .locator(".radar-map-canvas .leaflet-map")
    .evaluate((el) => (window.originalRadarMap = el));
  const before = await page
    .locator(".radar-map-canvas")
    .evaluate((el) => el.getBoundingClientRect().top);
  await pin.click();
  await page.getByText("Preparando localizações…", { exact: true }).waitFor();
  assert.equal(
    await page
      .getByRole("heading", { name: "Radar de Concentração", exact: true })
      .isVisible(),
    true,
  );
  assert.equal(await page.locator(".loading-grid").count(), 0);
  assert.match(page.url(), /mode=radar/);
  releaseData();
  await page
    .getByRole("heading", { name: "Conecte os pontos.", exact: true })
    .waitFor({ timeout: 45000 });
  assert.equal(
    await page
      .locator(".radar-map-canvas .leaflet-map")
      .evaluate((el) => el === window.originalRadarMap),
    true,
    "Radar must stay mounted while hidden",
  );
  const after = await page
    .locator(".territory-map")
    .evaluate((el) => el.getBoundingClientRect().top);
  assert.ok(
    Math.abs(after - before) < 3,
    `Map position jumped: ${before} -> ${after}`,
  );
  await page
    .locator(".territory-map .leaflet-map")
    .evaluate((el) => (window.originalLocationMap = el));
  const priorCalls = calls.length;
  await page
    .getByRole("button", { name: "Abrir mapa de calor", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Radar de concentração ativo", exact: true })
    .waitFor();
  assert.equal(
    await page
      .locator(".radar-map-canvas .leaflet-map")
      .evaluate((el) => el === window.originalRadarMap),
    true,
  );
  assert.equal(await chart.locator("h2").textContent(), title);
  assert.match(page.url(), /view=states/);
  assert.match(page.url(), /metric=networks/);
  assert.equal(
    calls.length,
    priorCalls,
    "Switching back must reuse existing data",
  );
  assert.equal(await page.locator(".loading-grid").count(), 0);
  await page
    .getByRole("button", {
      name: "Voltar ao mapa de localizações",
      exact: true,
    })
    .click();
  await page
    .getByRole("heading", { name: "Conecte os pontos.", exact: true })
    .waitFor();
  assert.equal(
    await page
      .locator(".territory-map .leaflet-map")
      .evaluate((el) => el === window.originalLocationMap),
    true,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Abrir mapa de calor", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Radar de concentração ativo", exact: true })
    .waitFor();
  await page.waitForFunction(
    () => document.documentElement.scrollWidth <= innerWidth,
  );
  await page
    .getByRole("button", {
      name: "Voltar ao mapa de localizações",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Mapa de localizações ativo", exact: true })
    .waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "Transitions passed: cold slow-data return retains Radar, no full-page skeleton, map DOM and drill-down persist, metric/view persist, no API reload, viewport anchor and mobile switching work.",
  );
} finally {
  releaseData();
  await browser.close();
}
