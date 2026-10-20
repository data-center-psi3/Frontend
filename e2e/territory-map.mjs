import { chromium } from "playwright";
import assert from "node:assert/strict";

const browser = await chromium.launch({
  executablePath:
    process.env.BROWSER_EXECUTABLE_PATH ??
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1536, height: 1100 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
try {
  await page.goto(
    `${process.env.PREVIEW_URL ?? "http://127.0.0.1:5173"}/#/mapa`,
  );
  await page.getByRole("heading", { name: "Conecte os pontos." }).waitFor();
  await page.locator(".territory-state-toggle").first().click();
  const cityName = await page
    .locator(".territory-child")
    .first()
    .locator("span")
    .first()
    .evaluate((el) => el.firstChild.textContent);
  await page.getByLabel("Explore uma cidade").fill(cityName);
  assert.ok((await page.locator(".territory-city").count()) >= 2);
  await page.locator(".territory-child").first().click();
  assert.equal(
    await page.locator(".territory-context > h2").textContent(),
    cityName,
  );
  await page.getByRole("button", { name: "Água", exact: true }).click();
  assert.equal(
    await page.locator(".territory-measure strong").textContent(),
    "m³",
  );
  await page.getByRole("button", { name: "Fonte", exact: true }).click();
  assert.match(
    await page.locator(".territory-advice").textContent(),
    /referência original/,
  );
  await page.locator(".territory-installations button").first().click();
  await page.locator(".details-panel h2").waitFor();
  await page.getByRole("button", { name: "Fechar detalhes" }).click();
  await page.getByRole("button", { name: "Ver todo o território" }).click();
  await page.getByLabel("Explore uma cidade").fill("");
  assert.equal(
    await page.locator(".territory-context > h2").textContent(),
    "Brasil",
  );
  await page.getByRole("button", { name: "Energia", exact: true }).click();
  await page.screenshot({
    path: "artifacts/territory-map-desktop.png",
    fullPage: true,
  });
  await page.getByLabel("Ativar tema escuro").click();
  await page.screenshot({
    path: "artifacts/territory-map-dark.png",
    fullPage: true,
  });
  await page.getByLabel("Ativar tema claro").click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(
    () => document.documentElement.scrollWidth <= innerWidth,
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
    false,
    "A página não deve ter overflow horizontal no celular",
  );
  await page.screenshot({
    path: "artifacts/territory-map-mobile.png",
    fullPage: true,
  });
  await page.getByLabel("Explore uma cidade").fill("zzzzzz");
  await page
    .getByRole("status")
    .filter({ hasText: "Nenhuma cidade encontrada." })
    .waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "Mapa: busca, seleção de cidade, detalhes, contexto ambiental, retorno ao território, temas e mobile verificados.",
  );
} finally {
  await browser.close();
}
