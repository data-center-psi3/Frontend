import { queryOptions, useQuery } from "@tanstack/react-query";
import type { Connection } from "../types/api";
import { loadNews } from "../services/news";

import { connectionKey } from "./keys";

export const newsQueryOptions = (connection: Connection) =>
  queryOptions({
    queryKey: ["news", connectionKey(connection)],
    queryFn: ({ signal }) => loadNews(connection, signal),
  });

export function useNewsQuery(connection: Connection) {
  return useQuery(newsQueryOptions(connection));
}
