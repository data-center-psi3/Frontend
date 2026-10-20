import { chromium } from "playwright";
import assert from "node:assert/strict";
import { demo } from "../src/mocks/demo.ts";

const browser = await chromium.launch({
  executablePath:
    process.env.BROWSER_EXECUTABLE_PATH ??
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 1100 },
  reducedMotion: "no-preference",
});
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
try {
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api", "");
    const collections = {
      "/data-centers": demo.centers,
      "/mapa": demo.points,
      "/indicadores-ambientais": demo.indicators,
      "/fontes": demo.sources,
      "/beneficios": demo.benefits,
      "/conteudos-pesquisa": demo.research,
    };
    const values = collections[path] ?? [];
    const detail = path.match(/^\/data-centers\/(\d+)$/);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        detail
          ? demo.centers.find((center) => center.id === Number(detail[1]))
          : path === "/dashboard"
            ? demo.dashboard
            : {
                content: values,
                page: {
                  number: 0,
                  size: 100,
                  totalPages: 1,
                  totalElements: values.length,
                },
              },
      ),
    });
  });
  const base = process.env.PREVIEW_URL ?? "http://127.0.0.1:5173";
  await page.goto(`${base}/#/dashboard`);
  const chart = page.locator(".panel").filter({
    has: page.getByRole("heading", {
      name: "Distribuição geográfica",
      exact: true,
    }),
  });
  const label = chart.getByRole("button", {
    name: "Abrir cidades de São Paulo",
    exact: true,
  });
  async function verifyBarGrowth() {
    const widths = await chart.evaluate(async (root) => {
      const samples = [];
      const start = performance.now();
      await new Promise((resolve) => {
        function sample() {
          samples.push(
            Math.max(
              0,
              ...[...root.querySelectorAll(".recharts-bar-rectangle path")].map(
                (bar) => bar.getBoundingClientRect().width,
              ),
            ),
          );
          if (performance.now() - start < 850) requestAnimationFrame(sample);
          else resolve();
        }
        sample();
      });
      return samples;
    });
    assert.ok(widths.at(-1) > 0, "As barras devem ficar visíveis ao final");
    assert.ok(
      widths.some((width) => width > 0 && width < widths.at(-1) * 0.9),
      "As barras devem crescer até o tamanho final",
    );
  }
  await label.waitFor();
  await label.focus();
  await page.keyboard.press("Enter");
  await verifyBarGrowth();
  await chart.getByText("Campinas", { exact: true }).waitFor();
  assert.equal(await chart.getByText("Fortaleza", { exact: true }).count(), 0);
  await chart.getByRole("button", { name: "Voltar aos estados" }).click();
  await verifyBarGrowth();
  await chart.locator(".recharts-bar-rectangle").first().click();
  await chart.getByRole("button", { name: "Voltar aos estados" }).waitFor();
  assert.equal(
    await page.evaluate(
      () => getComputedStyle(document.activeElement).outlineStyle,
    ),
    "none",
    "Selecionar uma barra com o mouse não deve deixar um contorno no gráfico",
  );
  await chart.screenshot({ path: "artifacts/geography-cities.png" });
  await page.goto(`${base}/#/mapa`);
  const arrow = page.getByRole("button", {
    name: "Expandir cidades de São Paulo",
    exact: true,
  });
  await arrow.click();
  assert.equal(
    await page.locator(".territory-context > h2").textContent(),
    "Brasil",
  );
  await page
    .getByRole("button", { name: /São Paulo SP · 3 instalações/ })
    .click();
  assert.match(await page.locator(".map-key").textContent(), /^3 instalações/);
  await page
    .getByRole("button", { name: "Recolher cidades de São Paulo" })
    .click();
  assert.equal(await page.locator(".territory-child").count(), 0);
  assert.match(await page.locator(".map-key").textContent(), /^3 instalações/);
  await page
    .getByRole("button", { name: "Expandir cidades de São Paulo" })
    .click();
  await page
    .getByRole("button", { name: /Campinas SP · 1 instalação/ })
    .click();
  assert.match(await page.locator(".map-key").textContent(), /^1 instalações/);
  // A fixed tile's offset from the canvas center detects both zoom and pan.
  await page.waitForTimeout(400);
  const tileSource = await page
    .locator(".territory-map .leaflet-tile")
    .first()
    .getAttribute("src");
  const camera = () =>
    page.evaluate((source) => {
      const canvas = document
        .querySelector(".territory-map .leaflet-map")
        .getBoundingClientRect();
      const tile = [
        ...document.querySelectorAll(".territory-map .leaflet-tile"),
      ].find((image) => image.getAttribute("src") === source);
      if (!tile) return null;
      const rect = tile.getBoundingClientRect();
      return {
        x: rect.x - canvas.x - canvas.width / 2,
        y: rect.y - canvas.y - canvas.height / 2,
        width: rect.width,
      };
    }, tileSource);
  const beforeSelection = await camera();
  assert.ok(beforeSelection);
  await page.locator(".territory-map .map-pin").click();
  await page
    .getByRole("complementary", { name: "Detalhes do data center" })
    .getByRole("heading", { name: "Instalação demonstrativa 01" })
    .waitFor();
  await page.waitForTimeout(400);
  const afterSelection = await camera();
  assert.ok(afterSelection, "O clique não deve trocar o zoom dos tiles");
  assert.equal(afterSelection.width, beforeSelection.width);
  assert.ok(
    Math.abs(afterSelection.x - beforeSelection.x) <= 1,
    "O centro horizontal deve ser preservado",
  );
  assert.ok(
    Math.abs(afterSelection.y - beforeSelection.y) <= 1,
    "O centro vertical deve ser preservado",
  );
  await page.getByRole("button", { name: "Fechar detalhes" }).click();
  await page.screenshot({
    path: "artifacts/geography-map-hierarchy.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(
    () => document.documentElement.scrollWidth <= innerWidth,
  );
  await page.screenshot({
    path: "artifacts/geography-map-hierarchy-mobile.png",
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  console.log(
    "Hierarquia validada: teclado e clique na barra, retorno, seta independente, seleção estadual/municipal e mobile.",
  );
} finally {
  await browser.close();
}
