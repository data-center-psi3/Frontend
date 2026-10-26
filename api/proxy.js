// Executado somente no servidor da Vercel; credenciais não entram no bundle.
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!["GET", "HEAD"].includes(req.method)) {
    res.setHeader("Allow", "GET, HEAD");
    return res
      .status(405)
      .json({ detail: "Este proxy permite somente leitura." });
  }

  const incoming = new URL(req.url, "http://proxy.local");
  const path = incoming.searchParams.get("__path");
  // A rota deve continuar dentro de /api, inclusive após normalização de URL.
  if (
    !path ||
    path.includes("\\") ||
    path.includes("%") ||
    path.split("/").some((part) => part === "." || part === "..")
  )
    return res.status(400).json({ detail: "Caminho de API inválido." });
  incoming.searchParams.delete("__path");
  // A Vercel pode incluir o parâmetro da rota dinâmica na query.
  // Ele identifica a rota no proxy e não é um filtro do backend.
  incoming.searchParams.delete("path");
  const radar = path === "radar" || path.startsWith("radar/");
  const env = process.env;
  const target = (radar && env.RADAR_API_PROXY_TARGET) || env.API_PROXY_TARGET;
  const username = (radar && env.RADAR_API_USERNAME) || env.API_USERNAME;
  const password = (radar && env.RADAR_API_PASSWORD) || env.API_PASSWORD;

  let upstream;
  try {
    const origin = new URL(target);
    if (
      origin.protocol !== "https:" ||
      origin.pathname !== "/" ||
      origin.search ||
      origin.hash ||
      origin.username ||
      origin.password ||
      !username ||
      !password
    )
      throw new Error("INVALID_CONFIG");
    upstream = new URL(`/api/${path}`, origin);
    upstream.search = incoming.searchParams.toString();
  } catch {
    console.error("[API proxy] Configuração ausente ou inválida na Vercel.");
    return res
      .status(500)
      .json({
        detail:
          "Configure o destino HTTPS e as credenciais da API nas variáveis de ambiente da Vercel.",
      });
  }

  try {
    const response = await fetch(upstream, {
      method: req.method,
      headers: {
        Accept: "application/json, application/problem+json",
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
      },
      redirect: "manual",
      signal: AbortSignal.timeout(55000),
    });
    if (response.status >= 300 && response.status < 400) {
      await response.body?.cancel();
      return res
        .status(502)
        .json({
          detail:
            "A API redirecionou a requisição. Confira o destino configurado.",
        });
    }
    const body = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);
    if (response.status === 401)
      console.error(
        "[API proxy] HTTP 401: confira as credenciais configuradas na Vercel e no backend.",
      );
    return res
      .status(response.status)
      .send(req.method === "HEAD" ? undefined : body);
  } catch (error) {
    const timeout = error.name === "TimeoutError";
    console.error(
      `[API proxy] ${timeout ? "TIMEOUT" : error.cause?.code || "CONNECTION_ERROR"}`,
    );
    return res
      .status(timeout ? 504 : 502)
      .json({
        detail: timeout
          ? "A API demorou para responder."
          : "Não foi possível conectar ao backend.",
      });
  }
}
