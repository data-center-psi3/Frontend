import { apiRoutes } from "./api";
import type { DataCenter } from "../types/api";
import type { Connection } from "../types/api";
import { createApi } from "./http/client";
import { allPages } from "./http/pagination";

export function loadDataCenters(connection: Connection, signal?: AbortSignal) {
  return allPages<DataCenter>(
    createApi(connection),
    apiRoutes.dataCenters,
    signal,
  );
}

export async function loadDataCenter(
  connection: Connection,
  id: number,
  signal?: AbortSignal,
) {
  const { data } = await createApi(connection).get<DataCenter>(
    apiRoutes.dataCenter(id),
    { signal },
  );
  return data;
}
