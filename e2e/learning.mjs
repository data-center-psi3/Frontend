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
let apiCalls = 0;
page.on("pageerror", (error) => errors.push(error.message));
try {
  await page.route("**/api/**", (route) => {
    apiCalls++;
    return route.abort();
  });
  await page.goto(
    `${process.env.PREVIEW_URL ?? "http://127.0.0.1:5173"}/#/por-dentro`,
  );
  await page
    .getByRole("heading", { name: "Por dentro de um Data Center." })
    .waitFor();
  assert.equal(
    apiCalls,
    0,
    "A experiência educativa deve funcionar sem carregar a API",
  );
  const illustration = page.locator(".learning-scene img");
  await illustration.waitFor();
  await illustration.evaluate((img) => img.decode());
  assert.ok(
    await illustration.evaluate(
      (img) => img.complete && img.naturalWidth > 1000,
    ),
  );
  for (const title of [
    "Servidores",
    "Refrigeração",
    "Energia",
    "Redes",
    "Segurança",
  ]) {
    await page
      .getByRole("button", { name: `Explorar ${title}`, exact: true })
      .click();
    await page
      .getByRole("complementary", { name: "Explicação da área selecionada" })
      .getByRole("heading", { name: title, exact: true })
      .waitFor();
    assert.equal(
      await page.locator(".learning-module-area.is-selected").count(),
      1,
    );
  }
  await page
    .getByRole("button", { name: "Explorar Refrigeração", exact: true })
    .click();
  const coolingArea = page.locator(
    '.learning-module-area[data-system="refrigeracao"]',
  );
  await page.waitForFunction(
    () =>
      getComputedStyle(
        document.querySelector(
          '.learning-module-area[data-system="refrigeracao"]',
        ),
      ).fillOpacity === "0.18",
  );
  assert.equal(
    await coolingArea.evaluate((el) => getComputedStyle(el).strokeOpacity),
    "0.9",
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "artifacts/learning-cooling-area.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Ampliar ilustração" }).click();
  assert.match(
    await page.locator(".learning-scene-footer").textContent(),
    /120%/,
  );
  await page.getByRole("button", { name: "Reduzir ilustração" }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "artifacts/learning-structure-desktop.png",
    fullPage: true,
  });
  await page.getByRole("tab", { name: "Simular impacto" }).click();
  assert.match(
    await page.locator(".learning-result-primary strong").textContent(),
    /540/,
  );
  const powerField = page.getByLabel(/Potência média da TI/);
  const powerSlider = page.getByRole("slider", {
    name: "Ajustar potência média da ti",
    exact: true,
  });
  await powerField.fill("1500");
  assert.equal(await powerSlider.inputValue(), "1500");
  await powerSlider.focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(await powerField.inputValue(), "1510");
  await powerSlider.scrollIntoViewIfNeeded();
  const sliderBounds = await powerSlider.boundingBox();
  await page.mouse.click(
    sliderBounds.x + sliderBounds.width * 0.75,
    sliderBounds.y + sliderBounds.height / 2,
  );
  assert.ok(Number(await powerField.inputValue()) > 1510);
  assert.equal(await powerField.inputValue(), await powerSlider.inputValue());
  await powerField.fill("25000");
  assert.equal(await powerSlider.getAttribute("max"), "25000");
  assert.equal(await powerSlider.inputValue(), "25000");
  await page.getByLabel(/PUE hipotético/).fill("1.234");
  assert.equal(
    await page
      .getByRole("slider", { name: "Ajustar pue hipotético", exact: true })
      .inputValue(),
    "1.234",
  );
  await page.getByRole("button", { name: "Restaurar exemplo" }).click();
  assert.equal(await powerSlider.inputValue(), "500");
  await page.getByLabel(/Potência média da TI/).fill("100");
  await page.getByLabel(/PUE hipotético/).fill("1.2");
  await page.getByLabel(/Horas de funcionamento/).fill("24");
  await page.getByLabel(/WUE hipotético/).fill("2");
  assert.match(
    await page.locator(".learning-result-primary strong").textContent(),
    /2,88/,
  );
  assert.match(
    await page.locator(".learning-water-result strong").textContent(),
    /4,8/,
  );
  await page.getByLabel(/PUE hipotético/).fill("0.9");
  await page.getByRole("alert").waitFor();
  assert.equal(await page.locator(".learning-result-primary").count(), 0);
  await page.getByRole("button", { name: "Restaurar exemplo" }).click();
  await page.getByLabel("Incluir cenário de água").uncheck();
  assert.equal(await page.locator(".learning-water-result").count(), 0);
  await page.getByLabel("Incluir cenário de água").check();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "artifacts/learning-simulator-desktop.png",
    fullPage: true,
  });
  await page.getByLabel("Ativar tema escuro").click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "artifacts/learning-simulator-dark.png",
    fullPage: true,
  });
  await page.getByLabel("Ativar tema claro").click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(
    () => document.documentElement.scrollWidth <= innerWidth,
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "artifacts/learning-simulator-mobile.png",
    fullPage: true,
  });
  await page.getByRole("tab", { name: "Explorar a estrutura" }).click();
  await page
    .getByRole("button", { name: "Explorar Refrigeração", exact: true })
    .click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: "artifacts/learning-structure-mobile.png",
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  assert.equal(apiCalls, 0);
  assert.deepEqual(errors, []);
  console.log(
    "Página educativa validada sem API: cinco áreas, imagem, zoom, cálculos, validação, água opcional, temas e celular.",
  );
} finally {
  await browser.close();
}
