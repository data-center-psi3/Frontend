import { apiRoutes } from "./api";
import type { Benefit } from "../types/api";
import type { Connection } from "../types/api";
import { createApi } from "./http/client";
import { allPages } from "./http/pagination";

export function loadBenefits(connection: Connection, signal?: AbortSignal) {
  return allPages<Benefit>(createApi(connection), apiRoutes.benefits, signal);
}
