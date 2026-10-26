import { apiRoutes } from "./api";
import type { Connection, CitySummary } from "../types/api";
import { createApi } from "./http/client";

export async function loadDashboard(
  connection: Connection,
  signal?: AbortSignal,
) {
  const { data } = await createApi(connection).get<CitySummary[]>(
    apiRoutes.dashboard,
    { signal },
  );
  if (!Array.isArray(data))
    throw new Error("O dashboard deve retornar um array.");
  return data;
}
