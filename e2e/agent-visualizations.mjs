import { chromium } from "playwright";
import assert from "node:assert/strict";
import { demo } from "../src/mocks/demo.ts";

// Fixtures belong only to browser verification, never to the application.
const data = Array.from({ length: 98 }, (_, i) => ({ cidade: `Município ${i + 1}`, valor: 98 - i }));
const spec = { schemaVersion: "1.0", type: "chart", chartType: "horizontalBar", title: "Distribuição por município", description: "98 registros recebidos da fonte.", datasetId: "dataset-test",
  columns: [{ field: "cidade", title: "Município", type: "nominal" }, { field: "valor", title: "Instalações", type: "quantitative", format: "integer" }],
  encoding: { x: { field: "cidade", title: "Município", type: "nominal" }, y: { field: "valor", title: "Instalações", type: "quantitative" } },
  data, metadata: { complete: true, totalRecords: 98, source: "Fixture de teste" } };
const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
try {
  for (const [name, viewport, theme] of [["desktop", { width: 1440, height: 1000 }, "light"], ["mobile", { width: 390, height: 844 }, "dark"]]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript((theme) => localStorage.setItem("dc-theme", theme), theme);
    await page.route("**/api/**", async (route) => {
      const path = new URL(route.request().url()).pathname.replace("/api", "");
      const collections = { "/data-centers": demo.centers, "/mapa": demo.points, "/indicadores-ambientais": demo.indicators, "/fontes": demo.sources, "/beneficios": demo.benefits, "/conteudos-pesquisa": demo.research };
      const values = collections[path] ?? [];
      const response = path === "/agent/chat" ? { response: "Os dados consultados estão no gráfico abaixo.", conversationId: "current-session", chartData: spec, visualization: spec }
        : path === "/agent/conversations" ? [{ id: "history-session", title: "Consulta salva", updatedAt: "2026-11-09T12:00:00Z", expired: false }]
        : path === "/agent/conversations/history-session" ? { id: "history-session", expired: false, messages: [{ role: "assistant", content: "Histórico restaurado.", visualization: { ...spec, title: "Gráfico antigo", data: data.slice(0, 2), metadata: { complete: true, totalRecords: 2 } } }] }
        : path === "/dashboard" ? demo.dashboard : { content: values, page: { number: 0, size: 100, totalPages: 1, totalElements: values.length } };
      await route.fulfill({ json: response });
    });
    await page.goto(`${process.env.PREVIEW_URL ?? "http://127.0.0.1:5183"}/#/dashboard`);
    await page.getByRole("button", { name: "Abrir assistente", exact: true }).click();
    await page.getByRole("textbox", { name: "Sua pergunta" }).fill("Mostrar todos os municípios");
    await page.getByRole("button", { name: "Enviar pergunta" }).click();
    await page.locator(".ai-chart .recharts-surface").waitFor();
    const chart = page.locator(".ai-visualization");
    const bounds = await chart.boundingBox();
    assert(bounds.x >= 0 && bounds.x + bounds.width <= viewport.width, "Visualization exceeds viewport");
    assert.equal(await page.locator(".ai-chart .recharts-bar-rectangle").count(), 98);
    await page.screenshot({ path: `artifacts/dynamic-viz-${name}.png` });
    await page.getByRole("button", { name: "Ver tabela", exact: true }).click();
    await page.getByRole("textbox", { name: "Pesquisar dados da tabela" }).fill("Município 98");
    await page.getByRole("cell", { name: "Município 98", exact: true }).waitFor();
    await page.getByRole("button", { name: "Restaurar visualização" }).click();
    await page.getByRole("button", { name: "Expandir", exact: true }).click();
    await page.getByRole("dialog", { name: "Distribuição por município", exact: true }).waitFor();
    await page.screenshot({ path: `artifacts/dynamic-viz-${name}-expanded.png` });
    await page.keyboard.press("Escape");
    assert(await page.getByRole("dialog", { name: "Assistente DataTerra", exact: true }).isVisible());
    await page.getByRole("combobox", { name: "Sessões anteriores" }).click();
    await page.getByRole("option", { name: /Consulta salva/ }).click();
    await page.getByRole("heading", { name: "Gráfico antigo", exact: true }).waitFor();
    assert.equal(await page.getByRole("heading", { name: "Distribuição por município", exact: true }).count(), 0);
    const pieData = Array.from({ length: 25 }, (_, i) => ({ estado: `UF ${i + 1}`, quantidade: i + 1 }));
    await page.route("**/api/agent/chat", (route) => route.fulfill({ json: {
      response: "Participação por estado.", conversationId: "pie-session", visualization: {
        schemaVersion: "1.0", type: "chart", chartType: "pie", title: "25 estados", dimension: "estado", metric: "quantidade", complete: true,
        encoding: { color: { field: "estado", type: "nominal" } }, data: pieData,
      },
    } }));
    await page.getByRole("button", { name: "Nova conversa", exact: true }).click();
    await page.getByRole("textbox", { name: "Sua pergunta" }).fill("Pizza por estado");
    await page.getByRole("button", { name: "Enviar pergunta" }).click();
    await page.locator(".ai-chart .recharts-pie-sector").last().waitFor();
    assert.equal(await page.locator(".ai-chart .recharts-pie-sector").count(), 25);
    assert.equal(await page.locator(".ai-pie-legend li").count(), 25);
    await page.getByRole("button", { name: "Expandir", exact: true }).click();
    await page.locator(".ai-chart .recharts-pie-sector").last().hover();
    await page.getByText("7,69% do total", { exact: true }).waitFor();
    const tooltip = page.locator(".analytics-tooltip");
    assert((await tooltip.innerText()).includes("UF 25"));
    const pieBox = await page.locator(".ai-chart-scroll").boundingBox();
    assert(pieBox.x >= 0 && pieBox.x + pieBox.width <= viewport.width);
    await page.screenshot({ path: `artifacts/dynamic-pie-25-${name}.png` });
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log("Desktop/mobile: 98 categories, history isolation, 25 pie slices, complete legend, category/value/percentage tooltip and responsive width passed.");
} finally { await browser.close(); }
