import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const radarDataSource = env.RADAR_DATA_SOURCE || "radar";
  if (!["radar", "imports"].includes(radarDataSource))
    throw new Error("RADAR_DATA_SOURCE deve ser radar ou imports.");
  // More specific route must precede /api: the Radar can run separately.
  const primaryTarget = env.API_PROXY_TARGET || "http://localhost:8080";
  const radarTarget = env.RADAR_API_PROXY_TARGET || primaryTarget;
  const makeProxy = (target, username, password) => {
    const url = new URL(target);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      url.username ||
      url.password
    )
      throw new Error(
        "API_PROXY_TARGET e RADAR_API_PROXY_TARGET devem conter apenas a origem HTTP/HTTPS, sem /api ou credenciais.",
      );
    if (!username || !password)
      throw new Error(
        "Credenciais da API ausentes. Configure API_USERNAME e API_PASSWORD no .env.local (ou as variáveis específicas do Radar).",
      );
    return {
      target,
      changeOrigin: true,
      proxyTimeout: 60000,
      timeout: 60000,
      configure(proxyServer) {
        proxyServer.on("proxyReq", (proxyReq) => {
          proxyReq.setHeader(
            "Authorization",
            `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
          );
        });
        proxyServer.on("proxyRes", (proxyRes) => {
          if (proxyRes.statusCode === 401)
            console.error(
              `[API proxy] ${url.origin}: HTTP 401. A API recusou as credenciais; confira as variáveis do proxy e do backend.`,
            );
        });
        proxyServer.on("error", (error) => {
          const codes = error.errors
            ?.map((cause) => cause.code)
            .filter(Boolean);
          console.error(
            `[API proxy] ${url.origin}: ${codes?.length ? [...new Set(codes)].join(", ") : error.code || "PROXY_ERROR"}. Verifique DNS, certificado, conexão e timeout.`,
          );
        });
      },
    };
  };
  const proxy = {
    "/api/radar": makeProxy(
      radarTarget,
      env.RADAR_API_USERNAME || env.API_USERNAME,
      env.RADAR_API_PASSWORD || env.API_PASSWORD,
    ),
    "/api": makeProxy(primaryTarget, env.API_USERNAME, env.API_PASSWORD),
  };
  return {
    plugins: [react(), tailwindcss()],
    define: {
      "import.meta.env.VITE_RADAR_DATA_SOURCE": JSON.stringify(radarDataSource),
      "import.meta.env.VITE_RADAR_ISOLATED": JSON.stringify(
        radarTarget.replace(/\/+$/, "") !== primaryTarget.replace(/\/+$/, "")
          ? "true"
          : "false",
      ),
    },
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    server: {
      host: "127.0.0.1",
      port: 5173,
      strictPort: true,
      proxy,
    },
    preview: { host: "127.0.0.1", proxy },
  };
});
