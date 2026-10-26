import { apiRoutes } from "./api";
import type { Research } from "../types/api";
import type { Connection } from "../types/api";
import { createApi } from "./http/client";
import { allPages } from "./http/pagination";

export function loadResearch(connection: Connection, signal?: AbortSignal) {
  return allPages<Research>(createApi(connection), apiRoutes.research, signal);
}
