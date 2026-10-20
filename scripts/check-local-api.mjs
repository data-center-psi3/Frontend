import { loadEnv } from "vite";
const env = loadEnv("development", process.cwd(), "");
const base = env.API_PROXY_TARGET || "http://localhost:8080";
const headers = {
  Authorization: `Basic ${Buffer.from(`${env.API_USERNAME}:${env.API_PASSWORD}`).toString("base64")}`,
};
for (const path of [
  "data-centers",
  "mapa",
  "indicadores-ambientais",
  "fontes",
  "beneficios",
  "conteudos-pesquisa",
  "dashboard",
  "importacoes",
]) {
  try {
    const response = await fetch(`${base}/api/${path}?size=100`, {
      headers,
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      console.log(`${path}: HTTP ${response.status}`);
      process.exitCode = 1;
      continue;
    }
    const data = await response.json();
    console.log(
      `${path}: ${Array.isArray(data) ? data.length : data.page?.totalElements} registros; ${Array.isArray(data) ? "array" : `${data.page?.totalPages} páginas`}`,
    );
  } catch (error) {
    console.log(`${path}: ${error.cause?.code || error.name}`);
    process.exitCode = 1;
  }
}
