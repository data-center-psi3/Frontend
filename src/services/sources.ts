import { apiRoutes } from "./api";
import type { Source } from "../types/api";
import type { Connection } from "../types/api";
import { createApi } from "./http/client";
import { allPages } from "./http/pagination";

export function loadSources(connection: Connection, signal?: AbortSignal) {
  return allPages<Source>(createApi(connection), apiRoutes.sources, signal);
}

export function loadDataCenterSources(
  connection: Connection,
  id: number,
  signal?: AbortSignal,
) {
  return allPages<Source>(
    createApi(connection),
    apiRoutes.dataCenterSources(id),
    signal,
    "id.fonteId,asc",
  );
}
