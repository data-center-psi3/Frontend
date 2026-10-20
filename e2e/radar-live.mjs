import { chromium } from "playwright";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1536, height: 1100 } });
const errors = [];
const calls = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("request", (r) => {
  if (r.url().includes("/api/")) calls.push(r.url());
});
try {
  const expectedTotal = (
    await (
      await page.request.get("http://127.0.0.1:5173/api/importacoes?size=1")
    ).json()
  ).page.totalElements;
  await page.goto("http://127.0.0.1:5173/#/mapa");
  await page
    .getByRole("heading", { name: "Conecte os pontos." })
    .waitFor({ timeout: 45000 });
  assert.equal(
    await page
      .getByRole("heading", { name: "Não foi possível carregar os dados" })
      .count(),
    0,
  );
  await page.getByRole("button", { name: "Abrir mapa de calor" }).click();
  await page.waitForFunction(
    (expected) =>
      document.querySelector(".radar-kpi strong")?.textContent ===
      new Intl.NumberFormat("pt-BR").format(expected),
    expectedTotal,
    { timeout: 45000 },
  );
  const totals = await page.locator(".radar-kpi strong").allTextContents();
  console.log("Totais reais no navegador:", totals);
  assert.ok(Number(totals[4].replaceAll(".", "")) > 0);
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
  assert.equal(
    calls.some((url) => url.includes("/api/radar/")),
    false,
    "Imports mode must not use the empty Radar inventory",
  );
  await page.getByRole("button", { name: "Por estados", exact: true }).click();
  await page.getByLabel("Estado do Radar", { exact: true }).click();
  // National domain uses searchable selector when more than twelve states are available.
  const dialog = page.getByRole("dialog");
  if (await dialog.count()) {
    await page
      .getByLabel("Pesquisar estado do radar", { exact: true })
      .fill("São Paulo");
    await dialog.getByRole("button", { name: /São Paulo \/ SP/ }).click();
  } else
    await page
      .getByRole("option", { name: "São Paulo / SP", exact: true })
      .click();
  await page
    .getByRole("heading", { name: "Instalações de São Paulo", exact: true })
    .waitFor();
  await page.locator(".radar-table-scroll tbody tr").first().waitFor();
  console.log(
    "Instalações reais de SP:",
    await page.locator(".radar-pagination span").textContent(),
  );
  await page.locator(".radar-table-scroll tbody button").first().click();
  await page.getByRole("dialog").waitFor();
  assert.ok(
    (await page.getByRole("dialog").textContent()).includes(
      "Identificador no levantamento",
    ),
  );
  await page.getByLabel("Fechar", { exact: true }).click();
  await page
    .getByRole("button", { name: "Limpar filtros", exact: true })
    .click();
  await page.waitForFunction(
    (expected) =>
      document.querySelector(".radar-kpi strong")?.textContent ===
      new Intl.NumberFormat("pt-BR").format(expected),
    expectedTotal,
  );
  await page
    .getByRole("button", { name: "Mapa de calor", exact: true })
    .click();
  await page.screenshot({
    path: "artifacts/radar-live-imports.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Localizações", exact: true }).click();
  await page.getByRole("heading", { name: "Conecte os pontos." }).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "Integração real validada: localizações, paginação completa, todos os registros, heatmap, estado, tabela, detalhes da fonte e retorno.",
  );
} finally {
  await browser.close();
}
