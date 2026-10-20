import axios from "axios";
import type { ImportedDataCenter } from "../types/imports";
import type {
  Connection,
  Dataset,
  Page,
  DataCenter,
  Source,
  Indicator,
  Benefit,
  Research,
  MapPoint,
  CitySummary,
} from "../types/api";
export function createApi(connection: Connection) {
  const baseURL = connection.baseUrl.replace(/\/+$/, "");
  return axios.create({
    baseURL: baseURL.endsWith("/api") ? baseURL : `${baseURL}/api`,
    timeout: 20000,
    auth: connection.username
      ? { username: connection.username, password: connection.password }
      : undefined,
    headers: { Accept: "application/json, application/problem+json" },
  });
}
export async function allPages<T>(
  client: ReturnType<typeof createApi>,
  path: string,
  signal?: AbortSignal,
  sort: string | null = "id,asc",
): Promise<T[]> {
  const items: T[] = [];
  for (let page = 0; ; page++) {
    const { data } = await client.get<Page<T>>(path, {
      params: { page, size: 100, sort: sort ?? undefined },
      signal,
    });
    if (
      !Array.isArray(data.content) ||
      !data.page ||
      !Number.isInteger(data.page.totalPages)
    )
      throw new Error("Resposta paginada incompatível com o contrato da API.");
    items.push(...data.content);
    if (data.page.number + 1 >= data.page.totalPages) return items;
    if (data.page.number !== page)
      throw new Error("A API não avançou a paginação.");
  }
}
export function loadImportedCenters(
  connection: Connection,
  signal?: AbortSignal,
) {
  return allPages<ImportedDataCenter>(
    createApi(connection),
    "/importacoes",
    signal,
    null,
  );
}
export async function loadDataset(
  connection: Connection,
  signal?: AbortSignal,
): Promise<Dataset> {
  const api = createApi(connection);
  const [centers, indicators, sources, benefits, research, points, dashboard] =
    await Promise.all([
      allPages<DataCenter>(api, "/data-centers", signal),
      allPages<Indicator>(api, "/indicadores-ambientais", signal),
      allPages<Source>(api, "/fontes", signal),
      allPages<Benefit>(api, "/beneficios", signal),
      allPages<Research>(api, "/conteudos-pesquisa", signal),
      allPages<MapPoint>(api, "/mapa", signal),
      api.get<CitySummary[]>("/dashboard", { signal }).then((r) => r.data),
    ]);
  if (!Array.isArray(dashboard))
    throw new Error("O dashboard deve retornar um array.");
  return {
    centers,
    indicators,
    sources,
    benefits,
    research,
    points,
    dashboard,
  };
}
export async function loadDetails(
  connection: Connection,
  id: number,
  signal?: AbortSignal,
) {
  const api = createApi(connection);
  const [center, sources] = await Promise.all([
    api.get<DataCenter>(`/data-centers/${id}`, { signal }).then((r) => r.data),
    allPages<Source>(
      api,
      `/data-centers/${id}/fontes`,
      signal,
      "id.fonteId,asc",
    ),
  ]);
  return { center, sources };
}
export function errorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401)
      return "As credenciais não foram aceitas. Revise o usuário e a senha da API.";
    if (error.code === "ECONNABORTED")
      return "A API demorou para responder. Tente novamente.";
    return (
      error.response?.data?.detail ??
      (error.response
        ? `A API retornou o código ${error.response.status}.`
        : "Não foi possível conectar à API. Verifique o endereço, o backend e a configuração de CORS.")
    );
  }
  return error instanceof Error
    ? error.message
    : "Não foi possível carregar os dados.";
}
