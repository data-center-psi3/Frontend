import { apiRoutes } from "./api";
import type { ImportedDataCenter } from "../types/imports";
import type { Connection } from "../types/api";
import { createApi } from "./http/client";
import { allPages } from "./http/pagination";

export function loadImportedCenters(
  connection: Connection,
  signal?: AbortSignal,
) {
  return allPages<ImportedDataCenter>(
    createApi(connection),
    apiRoutes.imports,
    signal,
    null,
  );
}
