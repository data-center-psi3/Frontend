import { chromium } from "playwright";
import assert from "node:assert/strict";

const browser = await chromium.launch({
  executablePath:
    process.env.BROWSER_EXECUTABLE_PATH ??
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1100 },
    reducedMotion: "no-preference",
  });
  await page.goto(
    (process.env.PREVIEW_URL ?? "http://127.0.0.1:5174").replace(/\/$/, "") +
      "/#/dashboard",
  );
  await page.locator(".distribution-slice").first().waitFor({ timeout: 60000 });
  assert.ok((await page.locator(".distribution-item").count()) >= 2);
  await page.locator(".distribution-item").first().hover();
  await page.waitForTimeout(600);
  const result = await page.evaluate(async () => {
    const previous = document.querySelectorAll(".distribution-slice")[1];
    const samples = [];
    const start = performance.now();
    document
      .querySelectorAll(".distribution-item")[1]
      .dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    await new Promise((resolve) => {
      function frame() {
        samples.push(
          Number(
            getComputedStyle(
              document.querySelectorAll(".distribution-slice")[1],
            ).opacity,
          ),
        );
        if (performance.now() - start < 800) requestAnimationFrame(frame);
        else resolve();
      }
      requestAnimationFrame(frame);
    });
    return {
      sameNode:
        previous === document.querySelectorAll(".distribution-slice")[1],
      samples,
    };
  });
  assert.equal(
    result.sameNode,
    true,
    "A troca de foco deve preservar a fatia no DOM",
  );
  assert.ok(
    result.samples.some((value) => value > 0.5 && value < 1),
    "A opacidade deve passar por valores intermediários",
  );
  assert.equal(result.samples.at(-1), 1);
  console.log(
    "Troca de foco suave confirmada no gráfico: fatias preservadas e opacidade animada.",
  );
} finally {
  await browser.close();
}
