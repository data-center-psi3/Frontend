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
page.on("pageerror", (e) => errors.push(e.message));
await mkdir("artifacts", { recursive: true });
async function shot(name) {
  await page.mouse.move(0, 0);
  await page.evaluate(() => {
    document.activeElement?.blur();
    window.scrollTo(0, 0);
  });
  await page.screenshot({
    path: `artifacts/${name}.png`,
    fullPage: true,
    animations: "disabled",
  });
}
try {
  await page.goto(
    (process.env.PREVIEW_URL ?? "http://127.0.0.1:5173/").replace(/\/$/, "") +
      "/#/dashboard",
  );
  await page.getByText("API local conectada", { exact: true }).waitFor();
  await page
    .getByRole("heading", { name: "Panorama ambiental", exact: true })
    .waitFor();
  assert.equal(await page.locator(".environmental-metric").count(), 5);
  await page.locator(".recharts-pie-sector path").first().waitFor();
  await shot("redesign-dashboard-desktop");
  await page.getByRole("button", { name: "Recolher navegação" }).click();
  assert.equal(await page.locator(".sidebar-collapsed").count(), 1);
  await page.getByRole("button", { name: "Expandir navegação" }).click();
  await page.getByLabel("Data center", { exact: true }).click();
  await page.getByRole("dialog").waitFor();
  await page
    .getByRole("dialog")
    .getByLabel("Pesquisar data center")
    .fill("campinas");
  assert((await page.locator(".searchable-options button").count()) > 1);
  await page.getByLabel("Fechar", { exact: true }).click();
  await page.getByLabel("Ativar tema escuro").click();
  await shot("redesign-dashboard-dark");
  await page.getByLabel("Ativar tema claro").click();
  for (const [name, file] of [
    ["Indicadores ambientais", "indicadores"],
    ["Comparação", "comparacao"],
    ["Mapa de data centers", "mapa"],
    ["Fontes e metodologia", "fontes"],
    ["Benefícios", "beneficios"],
    ["Sobre o projeto", "sobre"],
  ]) {
    await page.getByRole("link", { name, exact: true }).click();
    await page.getByRole("heading", { name, level: 1, exact: true }).waitFor();
    if (name === "Comparação")
      await page.getByText("O que você quer comparar?").waitFor();
    if (name === "Mapa de data centers")
      await page.getByRole("heading", { name: "Conecte os pontos." }).waitFor();
    await shot(`redesign-${file}-desktop`);
  }
  for (const width of [1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    if (width <= 768) {
      await page.getByLabel("Abrir navegação").click();
    }
    await page.getByRole("link", { name: "Visão geral", exact: true }).click();
    await page.getByRole("heading", { name: "Panorama ambiental" }).waitFor();
    await page.waitForFunction(
      () => document.documentElement.scrollWidth <= innerWidth,
    );
    if (width === 390) await shot("redesign-dashboard-mobile");
  }
  await page.getByLabel("Abrir navegação").click();
  await page.getByRole("link", { name: "Comparação", exact: true }).click();
  await page.getByText("O que você quer comparar?").waitFor();
  await page.waitForFunction(
    () => document.documentElement.scrollWidth <= innerWidth,
  );
  await shot("redesign-comparacao-mobile");
  await page.getByLabel("Abrir navegação").click();
  await page
    .getByRole("link", { name: "Mapa de data centers", exact: true })
    .click();
  await page.getByRole("heading", { name: "Conecte os pontos." }).waitFor();
  await page.waitForFunction(
    () => document.documentElement.scrollWidth <= innerWidth,
  );
  await shot("redesign-mapa-mobile");
  assert.deepEqual(errors, []);
  console.log(
    "Redesign validated: seven pages, five KPIs, searchable selector, collapsible sidebar, light/dark, 1536/1024/768/390/320px, no JavaScript exceptions.",
  );
} catch (error) {
  console.log("JavaScript errors:", errors);
  console.log(
    await page.evaluate(() => ({
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      overflow: [...document.querySelectorAll("body *")]
        .filter(
          (e) =>
            e.getBoundingClientRect().right > innerWidth + 1 &&
            !e.closest(".sidebar"),
        )
        .slice(0, 12)
        .map((e) => ({
          tag: e.tagName,
          className: e.getAttribute("class"),
          width: e.getBoundingClientRect().width,
        })),
    })),
  );
  await shot("redesign-failure");
  throw error;
} finally {
  await browser.close();
}
