import { apiRoutes } from "./api";
import type { Indicator } from "../types/api";
import type { Connection } from "../types/api";
import { createApi } from "./http/client";
import { allPages } from "./http/pagination";

export function loadIndicators(connection: Connection, signal?: AbortSignal) {
  return allPages<Indicator>(
    createApi(connection),
    apiRoutes.indicators,
    signal,
  );
}
