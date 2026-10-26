import { apiRoutes } from "./api";
import type { News } from "../types/news";
import type { Connection } from "../types/api";
import { createApi } from "./http/client";
import { allPages } from "./http/pagination";

export function loadNews(connection: Connection, signal?: AbortSignal) {
  return allPages<News>(createApi(connection), apiRoutes.news, signal);
}
