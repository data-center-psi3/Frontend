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
  const makeProxy = (target, username, password) => ({
    target,
    changeOrigin: true,
    configure(proxyServer) {
      proxyServer.on("proxyReq", (proxyReq) => {
        if (username && password)
          proxyReq.setHeader(
            "Authorization",
            `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
          );
      });
    },
  });
  const proxy = {
    "/api/radar": makeProxy(
      radarTarget,
      env.RADAR_API_USERNAME ?? env.API_USERNAME,
      env.RADAR_API_PASSWORD ?? env.API_PASSWORD,
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
