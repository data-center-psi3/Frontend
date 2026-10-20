import { chromium } from "playwright";
import assert from "node:assert/strict";
// Synthetic responses only in this regression test; app loads real /api/importacoes.
const rows = [
  {
    idOriginal: "EXT-1",
    unidade: "Unidade A",
    operador: "Operador A",
    municipio: "Campinas",
    uf: "SP",
    codigoIbge: "3509502",
    latitude: "-22,9",
    longitude: "-47,0",
    redesConectadas: "10",
    ixConectados: "0",
    carriers: "2",
    tipoInstalacao: "Colocation",
  },
  {
    idOriginal: "EXT-2",
    unidade: "Sem coordenadas",
    operador: "Operador A",
    municipio: "Campinas",
    uf: "SP",
    codigoIbge: "3509502",
    latitude: "—",
    longitude: null,
    redesConectadas: "0",
    ixConectados: null,
    carriers: null,
    tipoInstalacao: "Colocation",
  },
  {
    idOriginal: "EXT-3",
    unidade: "Unidade C",
    operador: "Operador B",
    municipio: "Rio de Janeiro",
    uf: "RJ",
    latitude: "-22,9",
    longitude: "-43,2",
    redesConectadas: "—",
    ixConectados: "—",
    carriers: "—",
    tipoInstalacao: "Campus",
  },
  {
    idOriginal: "EXT-4",
    unidade: "Unidade D",
    operador: "Operador C",
    municipio: "Fortaleza",
    uf: "CE",
    latitude: "-3,7",
    longitude: "-38,5",
    redesConectadas: "3",
    ixConectados: "0",
    carriers: "0",
    tipoInstalacao: "Campus",
  },
  {
    idOriginal: "EXT-5",
    unidade: "Zero geográfico válido",
    operador: "operador a",
    municipio: "São Paulo",
    uf: "SP",
    latitude: "0",
    longitude: "0",
    redesConectadas: "1,5",
    ixConectados: "—",
    carriers: "—",
    tipoInstalacao: "Colocation",
  },
];
const browser = await chromium.launch({
  executablePath:
    process.env.BROWSER_EXECUTABLE_PATH ??
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }),
  errors = [],
  calls = [];
let failSecond = false;
let releaseFirstPage;
const firstPageGate = new Promise((resolve) => {
  releaseFirstPage = resolve;
});
page.on("pageerror", (e) => errors.push(e.message));
await page.route("**/api/**", async (route) => {
  const url = new URL(route.request().url());
  calls.push(url);
  assert.equal(
    url.pathname,
    "/api/importacoes",
    "Imports must never query the unrelated Radar/legacy inventory",
  );
  const current = Number(url.searchParams.get("page"));
  if (current === 0) await firstPageGate;
  if (current === 1 && failSecond)
    return route.fulfill({ status: 503, json: { detail: "Test failure" } });
  await new Promise((r) => setTimeout(r, 120));
  return route.fulfill({
    json: {
      content: rows.slice(current * 2, current * 2 + 2),
      page: { number: current, totalPages: 3, totalElements: 5, size: 2 },
    },
  });
});
const root = process.env.PREVIEW_URL ?? "http://127.0.0.1:5173";
try {
  await page.goto(`${root}/#/radar?view=heat`, {
    waitUntil: "domcontentloaded",
  });
  await page
    .getByText("Carregando indicadores de Brasil…", { exact: true })
    .waitFor();
  releaseFirstPage();
  await page.waitForFunction(
    () => document.querySelector(".radar-kpi strong")?.textContent === "5",
  );
  assert.deepEqual(await page.locator(".radar-kpi strong").allTextContents(), [
    "5",
    "3",
    "4",
    "3",
    "4",
    "13",
  ]);
  assert.deepEqual(
    [...new Set(calls.map((url) => url.searchParams.get("page")))],
    ["0", "1", "2"],
  );
  await page.waitForFunction(() => {
    const c = document.querySelector("canvas.radar-heat-layer");
    return (
      c &&
      c
        .getContext("2d")
        .getImageData(0, 0, c.width, c.height)
        .data.some((v, i) => i % 4 === 3 && v > 0)
    );
  });
  const initialCalls = calls.length;
  await page.getByLabel("Estado do Radar", { exact: true }).click();
  await page
    .getByRole("option", { name: "São Paulo / SP", exact: true })
    .click();
  await page.waitForFunction(
    () => document.querySelector(".radar-kpi strong")?.textContent === "3",
  );
  assert.equal(await page.locator(".radar-table-scroll tbody tr").count(), 3);
  await page
    .getByLabel("Pesquisar instalações do Radar")
    .fill("Sem coordenadas");
  const table = page.locator(".radar-table-scroll tbody tr");
  assert.equal(await table.count(), 1);
  assert.equal(await table.locator("td").nth(4).textContent(), "0");
  assert.equal(await table.locator("td").nth(5).textContent(), "Não informado");
  await table.getByRole("button").click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  assert.ok((await dialog.textContent()).includes("EXT-2"));
  assert.ok(
    (await dialog.textContent()).includes("Não informado / Não informado"),
  );
  await page.getByLabel("Fechar", { exact: true }).click();
  await page
    .getByRole("button", { name: "Conectividade", exact: true })
    .click();
  await page.getByLabel("Indicador de conectividade").click();
  await page
    .getByRole("option", { name: "Média de redes", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll(".radar-view-switch button")].find(
        (el) => el.textContent === "Mapa de calor",
      )?.disabled,
  );
  await page
    .getByRole("link", { name: "Explorar estado", exact: true })
    .click();
  await page.waitForURL(/radar\/estado\/SP/);
  assert.equal(
    calls.length,
    initialCalls,
    "Local filters and navigation must share all imported pages",
  );
  await page
    .getByRole("button", { name: "Limpar filtros", exact: true })
    .click();
  await page.waitForFunction(
    () => document.querySelector(".radar-kpi strong")?.textContent === "5",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(
    () => document.documentElement.scrollWidth <= innerWidth,
  );
  failSecond = true;
  await page.reload();
  await page
    .getByText("Não foi possível carregar registros importados do Radar.", {
      exact: true,
    })
    .waitFor();
  assert.equal(
    await page.locator(".radar-kpi strong").count(),
    0,
    "A failed page must never present a partial total",
  );
  failSecond = false;
  await page
    .getByRole("button", { name: "Tentar novamente", exact: true })
    .click();
  await page.waitForFunction(
    () => document.querySelector(".radar-kpi strong")?.textContent === "5",
  );
  assert.deepEqual(errors, []);
  console.log(
    "Imports E2E passed: all pages, comma decimals, genuine zero, unknown data, heat, filters/cache, state navigation, non-geocoded details, mobile and recovery after a failed page.",
  );
} finally {
  await browser.close();
}
