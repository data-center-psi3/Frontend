import { apiRoutes } from "./api";
import type { MapPoint } from "../types/api";
import type { Connection } from "../types/api";
import { createApi } from "./http/client";
import { allPages } from "./http/pagination";

export function loadMapPoints(connection: Connection, signal?: AbortSignal) {
  return allPages<MapPoint>(createApi(connection), apiRoutes.map, signal);
}
