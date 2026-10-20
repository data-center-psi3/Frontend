import { chromium } from "playwright";
import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import ts from "typescript";
// Synthetic fixtures exist only in this test, never as an application fallback.
const source = ts.transpileModule(await readFile("src/mocks/demo.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.ESNext },
}).outputText;
const { demo } = await import(
  `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
);
const centers = demo.centers.map((row, index) => ({
  ...row,
  empresa: index % 2 ? "Operador B" : "Operador A",
  tipoInstalacao: "Colocation",
}));
centers.push({
  ...centers[0],
  id: 99,
  nome: "Cadastro sem coordenadas",
  latitude: null,
  longitude: null,
});
const points = centers
  .filter((row) => row.latitude !== null)
  .map((row, index) => ({
    id: row.id,
    unidade: row.nome,
    operador: row.empresa,
    municipio: row.cidade,
    uf: row.estado,
    latitude: row.latitude,
    longitude: row.longitude,
    tipoInstalacao: row.tipoInstalacao,
    precisaoGeo: "Município",
    redesConectadas: index === 0 ? null : index === 1 ? 0 : index * 4,
    ixConectados: null,
    carriers: index,
  }));
const regions = {
  SP: "Sudeste",
  RJ: "Sudeste",
  CE: "Nordeste",
  RS: "Sul",
  DF: "Centro-Oeste",
  PR: "Sul",
};
const sum = (rows, key) => {
  const values = rows
    .map((row) => row[key])
    .filter((value) => typeof value === "number");
  return values.length ? values.reduce((a, b) => a + b, 0) : null;
};
function aggregate(rows) {
  const geo = points.filter((point) => rows.some((row) => row.id === point.id));
  const totalRedesRegistradas = sum(geo, "redesConectadas"),
    totalIxRegistrados = sum(geo, "ixConectados"),
    totalCarriersRegistrados = sum(geo, "carriers");
  const n = geo.filter((point) => point.redesConectadas !== null).length;
  const conectividade = {
    totalRedesRegistradas,
    totalIxRegistrados,
    totalCarriersRegistrados,
    mediaRedesPorInstalacao: n ? totalRedesRegistradas / n : null,
    mediaIxPorInstalacao: null,
    mediaCarriersPorInstalacao: geo.length
      ? totalCarriersRegistrados / geo.length
      : null,
    instalacoesComConectividade: geo.length,
    instalacoesComRedes: n,
    instalacoesComIx: 0,
    instalacoesComCarriers: geo.length,
  };
  return {
    totalInstalacoes: rows.length,
    totalOperadores: new Set(rows.map((row) => row.empresa)).size,
    totalMunicipios: new Set(rows.map((row) => `${row.estado}/${row.cidade}`))
      .size,
    totalEstados: new Set(rows.map((row) => row.estado)).size,
    instalacoesComCoordenadas: geo.length,
    totalRedesRegistradas,
    totalIxRegistrados,
    totalCarriersRegistrados,
    conectividade,
  };
}
function group(rows, key, build) {
  return [...new Set(rows.map((row) => row[key]))].map((value) =>
    build(
      value,
      rows.filter((row) => row[key] === value),
    ),
  );
}
function stateRows(rows) {
  return group(rows, "estado", (uf, items) => ({
    uf,
    ...aggregate(items),
    participacaoNacional: (items.length / centers.length) * 100,
    mediaRedesPorInstalacao:
      aggregate(items).conectividade.mediaRedesPorInstalacao,
  }));
}
function cityRows(rows) {
  return group(rows, "cidade", (municipio, items) => ({
    municipio,
    uf: items[0].estado,
    codigoIbge: null,
    ...aggregate(items),
  }));
}
function operatorRows(rows) {
  return group(rows, "empresa", (operador, items) => ({
    operador,
    ...aggregate(items),
  })).sort((a, b) => b.totalInstalacoes - a.totalInstalacoes);
}
const browser = await chromium.launch({
  executablePath:
    process.env.BROWSER_EXECUTABLE_PATH ??
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1536, height: 1100 } });
const errors = [],
  calls = [];
let failMap = false,
  delayOverview = false;
page.on("pageerror", (error) => errors.push(error.message));
await page.route("**/tile.openstreetmap.org/**", (route) =>
  route.fulfill({
    status: 200,
    contentType: "image/svg+xml",
    body: '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#edf0f2"/></svg>',
  }),
);
await page.route("**/api/**", async (route) => {
  const url = new URL(route.request().url()),
    path = url.pathname.replace(/^\/api/, ""),
    params = url.searchParams;
  calls.push(url);
  const filtered = centers.filter(
    (row) =>
      (!params.get("uf") || row.estado === params.get("uf")) &&
      (!params.get("region") || regions[row.estado] === params.get("region")) &&
      (!params.get("operator") || row.empresa === params.get("operator")) &&
      (!params.get("installationType") ||
        row.tipoInstalacao === params.get("installationType")),
  );
  let data;
  if (path.startsWith("/radar")) {
    if (path === "/radar/map" && failMap)
      return route.fulfill({
        status: 503,
        json: { detail: "Test only: map unavailable" },
      });
    if (path === "/radar/overview" && delayOverview)
      await new Promise((resolve) => setTimeout(resolve, 400));
    if (path === "/radar/overview") data = aggregate(filtered);
    else if (path === "/radar/states") data = stateRows(filtered);
    else if (path === "/radar/map")
      data = points.filter((point) =>
        filtered.some((row) => row.id === point.id),
      );
    else if (path === "/radar/filters")
      data = {
        states: [...new Set(centers.map((row) => row.estado))],
        operators: ["Operador A", "Operador B"],
        installationTypes: ["Colocation"],
        regions: ["Sudeste", "Nordeste", "Sul", "Centro-Oeste"],
      };
    else if (path.endsWith("/cities") || path === "/radar/cities/ranking")
      data = cityRows(filtered);
    else if (path === "/radar/operators/ranking") data = operatorRows(filtered);
    else if (/^\/radar\/states\/[A-Z]{2}$/.test(path)) {
      const uf = path.split("/").at(-1);
      data = {
        uf,
        nome: uf,
        indicadores: stateRows(filtered)[0] ?? {
          uf,
          ...aggregate([]),
          participacaoNacional: 0,
        },
        operadores: operatorRows(filtered),
        municipios: cityRows(filtered),
      };
    } else throw Error(`Unhandled Radar path: ${path}`);
  } else if (path === "/dashboard") data = demo.dashboard;
  else if (/^\/data-centers\/\d+$/.test(path))
    data = centers.find((row) => row.id === Number(path.split("/").at(-1)));
  else {
    const rows =
      path === "/data-centers"
        ? centers
        : path === "/mapa"
          ? centers.filter((row) => row.latitude !== null)
          : path === "/indicadores-ambientais"
            ? demo.indicators
            : path === "/fontes"
              ? demo.sources
              : [];
    data = {
      content: rows,
      page: { number: 0, totalPages: 1, totalElements: rows.length, size: 100 },
    };
  }
  return route.fulfill({ json: data });
});
const root = process.env.PREVIEW_URL ?? "http://127.0.0.1:5173";
const kpi = (index) => page.locator(".radar-kpi strong").nth(index);
async function choose(label, value) {
  await page.getByLabel(label, { exact: true }).click();
  await page.getByRole("option", { name: value, exact: true }).click();
}
try {
  await page.goto(`${root}/#/mapa`);
  await page.getByRole("heading", { name: "Conecte os pontos." }).waitFor();
  assert.equal(
    calls.filter((url) => url.pathname.includes("/radar")).length,
    0,
  );
  await page
    .getByRole("button", { name: "Expandir cidades de São Paulo" })
    .click();
  await page.getByRole("button", { name: /Campinas SP/ }).click();
  const original = await page
    .locator(".territory-map .leaflet-map")
    .evaluate((el) => {
      window.originalMap = el;
      return el.querySelector(".leaflet-map-pane").style.transform;
    });
  await page.getByRole("button", { name: "Abrir mapa de calor" }).click();
  await page
    .getByRole("heading", { name: "Radar de Concentração", exact: true })
    .waitFor();
  await page.waitForFunction(
    () => document.querySelectorAll(".radar-kpi strong").length === 6,
  );
  assert.equal(await kpi(0).textContent(), "9");
  assert.equal(await kpi(1).textContent(), "2");
  await page.waitForFunction(
    () =>
      document.querySelectorAll(
        ".radar-map-canvas .leaflet-overlay-pane svg path",
      ).length === 27,
  );
  await page.waitForFunction(() => {
    const c = document.querySelector("canvas.radar-heat-layer");
    return (
      c &&
      c
        .getContext("2d")
        .getImageData(0, 0, c.width, c.height)
        .data.some((x, i) => i % 4 === 3 && x > 0)
    );
  });
  const initialMapRequests = calls.filter(
    (url) => url.pathname === "/api/radar/map",
  ).length;
  await page.getByRole("button", { name: "Operadores", exact: true }).click();
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll(".radar-view-switch button")].find(
        (b) => b.textContent === "Mapa de calor",
      )?.disabled,
  );
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
        (b) => b.textContent === "Mapa de calor",
      )?.disabled,
  );
  await page.getByLabel("Indicador de conectividade").click();
  await page
    .getByRole("option", { name: "IX registrados", exact: true })
    .click();
  await page.waitForFunction(() =>
    document
      .querySelector(".radar-ranking")
      ?.textContent.includes("Não informado"),
  );
  assert.equal(
    calls.filter((url) => url.pathname === "/api/radar/map").length,
    initialMapRequests,
    "Metrics reuse the cached geographical points",
  );
  await page.getByRole("button", { name: "Instalações", exact: true }).click();
  await page.getByRole("button", { name: "Marcadores", exact: true }).click();
  await page
    .locator(".radar-map-canvas .leaflet-marker-icon")
    .first()
    .waitFor();
  await choose("Estado do Radar", "São Paulo / SP");
  await page
    .getByRole("heading", { name: "Instalações de São Paulo", exact: true })
    .waitFor();
  await page.waitForFunction(
    () => document.querySelector(".radar-kpi strong")?.textContent === "4",
  );
  assert.equal(await page.locator(".radar-table-scroll tbody tr").count(), 4);
  assert.ok(
    (await page.locator(".radar-table-scroll").textContent()).includes(
      "Cadastro sem coordenadas",
    ),
  );
  await choose("Operador do Radar", "Operador A");
  const combinedResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.pathname === "/api/radar/overview" &&
      url.searchParams.get("uf") === "SP" &&
      url.searchParams.get("operator") === "Operador A" &&
      url.searchParams.get("installationType") === "Colocation"
    );
  });
  await choose("Tipo de instalação do Radar", "Colocation");
  await combinedResponse;
  await page.waitForFunction(
    () => document.querySelector(".radar-kpi strong")?.textContent === "3",
  );
  assert.ok(
    calls.some(
      (url) =>
        url.pathname === "/api/radar/overview" &&
        url.searchParams.get("uf") === "SP" &&
        url.searchParams.get("operator") === "Operador A" &&
        url.searchParams.get("installationType") === "Colocation",
    ),
  );
  await page.getByRole("button", { name: "Localizações", exact: true }).click();
  await page.getByRole("heading", { name: "Conecte os pontos." }).waitFor();
  assert.equal(
    await page.locator(".territory-context > h2").textContent(),
    "Campinas",
  );
  assert.equal(
    await page
      .locator(".territory-map .leaflet-map")
      .evaluate((el) => el === window.originalMap),
    true,
    "Location map stays mounted",
  );
  assert.equal(
    await page
      .locator(".territory-map .leaflet-map-pane")
      .evaluate((el) => el.style.transform),
    original,
    "Original viewport survives switching modes",
  );
  await page.getByRole("button", { name: "Abrir mapa de calor" }).click();
  await page
    .getByRole("button", { name: "Limpar filtros", exact: true })
    .click();
  await page.waitForFunction(
    () => document.querySelector(".radar-kpi strong")?.textContent === "9",
  );
  await choose("Estado do Radar", "São Paulo / SP");
  await page
    .getByRole("link", { name: "Explorar estado", exact: true })
    .click();
  await page.waitForURL(/radar\/estado\/SP/);
  await page.locator(".radar-table-scroll tbody tr").first().waitFor();
  await page
    .getByLabel("Pesquisar instalações do Radar")
    .fill("sem coordenadas");
  assert.equal(await page.locator(".radar-table-scroll tbody tr").count(), 1);
  await page.getByLabel("Pesquisar instalações do Radar").fill("");
  await page.screenshot({
    path: "artifacts/radar-state-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Limpar filtros", exact: true })
    .click();
  await page.getByRole("button", { name: "Por estados", exact: true }).click();
  // Polygon clicks choose their real UF, then all data sections synchronize.
  const sp = page
    .locator(".radar-map-canvas .leaflet-overlay-pane svg path")
    .nth(21);
  await sp.dispatchEvent("click");
  assert.match(page.url(), /uf=/);
  await page
    .getByRole("button", { name: "Limpar filtros", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Mapa de calor", exact: true })
    .click();
  await page.screenshot({
    path: "artifacts/radar-heat-desktop.png",
    fullPage: true,
  });
  await page.getByLabel("Ativar tema escuro").click();
  await page.screenshot({ path: "artifacts/radar-dark.png", fullPage: true });
  await page.getByLabel("Ativar tema claro").click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(
    () => document.documentElement.scrollWidth <= innerWidth,
  );
  await page.screenshot({ path: "artifacts/radar-mobile.png", fullPage: true });
  await page.keyboard.press("Tab");
  assert.ok(
    await page.evaluate(() => document.activeElement !== document.body),
  );
  // A failed point endpoint must leave the overview/rankings available and be retryable.
  failMap = true;
  delayOverview = true;
  await page.goto(
    `${root}/#/radar?view=heat&operator=Operador%20B&region=Nordeste`,
  );
  await page
    .getByText("Carregando indicadores de Brasil…", { exact: true })
    .waitFor();
  await page
    .getByText("Não foi possível carregar pontos geográficos.", { exact: true })
    .waitFor();
  await page.waitForFunction(
    () => document.querySelector(".radar-kpi strong")?.textContent === "0",
  );
  failMap = false;
  await page
    .locator(".radar-map-panel")
    .getByRole("button", { name: "Tentar novamente" })
    .click();
  await page
    .getByText("Nenhum Data Center encontrado para os filtros selecionados.", {
      exact: true,
    })
    .waitFor();
  // A fresh standalone route needs only Radar endpoints, never the old dataset gate.
  const oldCalls = calls.filter(
    (url) => !url.pathname.includes("/radar/"),
  ).length;
  await page.goto(`${root}/#/radar/estado/RJ?metric=operators&view=states`);
  await page
    .getByRole("heading", {
      name: "Instalações de Rio de Janeiro",
      exact: true,
    })
    .waitFor();
  assert.equal(
    calls.filter((url) => !url.pathname.includes("/radar/")).length,
    oldCalls,
  );
  await page.locator(".radar-table-scroll tbody button").first().click();
  await page.waitForURL(/mapa\?selected=/);
  await page.locator(".details-panel h2").waitFor();
  await page.goto(`${root}/#/radar/estado/SP?view=markers`);
  await page
    .getByLabel("Pesquisar instalações do Radar")
    .fill("sem coordenadas");
  await page.locator(".radar-table-scroll tbody button").first().click();
  await page.waitForURL(/mapa\?selected=99/);
  await page
    .locator(".details-panel h2")
    .filter({ hasText: "Cadastro sem coordenadas" })
    .waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "Radar E2E passed: isolated activation, real GeoJSON, heat pixels, metrics, caching, AND filters, state/table navigation, preserved viewport, null data, partial errors, retry, responsive layout and keyboard.",
  );
} finally {
  await browser.close();
}
