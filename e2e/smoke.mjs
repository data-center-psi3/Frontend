import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath:
    process.env.BROWSER_EXECUTABLE_PATH ??
    (process.platform === "win32"
      ? "C:/Program Files/Google/Chrome/Application/chrome.exe"
      : undefined),
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1536, height: 1100 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await mkdir("artifacts", { recursive: true });
try {
  const baseUrl = process.env.PREVIEW_URL ?? "http://127.0.0.1:5173";
  await page.goto(`${baseUrl}/#/mapa`);
  await page.getByText("API local conectada", { exact: true }).waitFor();
  const centersResponse = await page.request.get(
    `${baseUrl}/api/data-centers?size=100`,
  );
  assert.equal(centersResponse.status(), 200);
  const centers = await centersResponse.json();
  const mapResponse = await page.request.get(`${baseUrl}/api/mapa?size=100`);
  assert.equal(mapResponse.status(), 200);
  const points = await mapResponse.json();
  await page.getByRole("heading", { name: "Conecte os pontos." }).waitFor();
  const located = await page
    .locator(".territory-explorer")
    .first()
    .getAttribute("data-point-count");
  assert.equal(Number(located), points.page.totalElements);
  const rawResponse = await page.request.get(
    `${baseUrl}/api/importacoes?size=100`,
  );
  assert.equal(rawResponse.status(), 200);
  const raw = await rawResponse.json();
  if (raw.page.totalElements) {
    await page.locator(".raw-data-table tbody tr").first().waitFor();
    await page.waitForFunction(
      (total) =>
        document.querySelectorAll(".raw-data-table tbody tr").length === total,
      raw.page.totalElements,
    );
    assert.equal(await page.locator(".raw-data-table th").count(), 28);
  }
  assert.equal(
    await page
      .getByRole("button", {
        name: /Conectar|Configurar conexão|demonstração/i,
      })
      .count(),
    0,
  );
  assert.equal(await page.locator(".demo-banner").count(), 0);
  for (
    let attempt = 0;
    attempt < 6 && !(await page.locator(".map-pin").count());
    attempt++
  ) {
    await page.locator(".leaflet-control-zoom-in").click();
  }
  await page.locator(".map-pin").first().click();
  await page
    .getByRole("complementary", { name: "Detalhes do data center" })
    .getByRole("heading", { level: 2 })
    .waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "artifacts/mapa-base-real.png",
    fullPage: true,
  });
  await page.getByLabel("Fechar detalhes").click();
  for (const title of [
    "Visão geral",
    "Indicadores ambientais",
    "Comparação",
    "Benefícios",
    "Fontes e metodologia",
    "Sobre o projeto",
  ]) {
    await page.getByRole("link", { name: title, exact: true }).click();
    await page
      .getByRole("heading", { name: title, exact: true, level: 1 })
      .waitFor();
  }
  await page.getByRole("link", { name: "Visão geral", exact: true }).click();
  await page
    .getByRole("heading", { name: "Panorama dos indicadores" })
    .waitFor();
  await page.getByLabel("Ativar tema escuro").click();
  assert.equal(await page.locator("html.dark").count(), 1);
  await page.getByLabel("Ativar tema claro").click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(
    () => document.documentElement.scrollWidth <= innerWidth,
  );
  await page.getByLabel("Abrir navegação").click();
  await page
    .getByRole("link", { name: "Mapa de data centers", exact: true })
    .click();
  await page.getByRole("heading", { name: "Conecte os pontos." }).waitFor();
  await page.waitForFunction(
    () => document.documentElement.scrollWidth <= innerWidth,
  );
  await page.reload();
  await page.getByText("API local conectada", { exact: true }).waitFor();
  assert.equal(
    Number(
      await page
        .locator(".territory-explorer")
        .first()
        .getAttribute("data-point-count"),
    ),
    points.page.totalElements,
  );
  assert.deepEqual(errors, []);
  console.log(
    `API local validada no navegador: ${centers.page.totalElements} cadastros, ${located} pontos, sete páginas, detalhes, tema e conexão automática após recarregar.`,
  );
} finally {
  await browser.close();
}
