import { queryOptions, useQuery } from "@tanstack/react-query";
import type { Connection } from "../types/api";
import { loadDataset, loadDetails } from "../services/dataset";
import { loadDataCenters } from "../services/dataCenters";
import { connectionKey } from "./keys";

export const datasetQueryOptions = (connection: Connection) =>
  queryOptions({
    queryKey: ["dataset", connectionKey(connection)],
    queryFn: ({ signal }) => loadDataset(connection, signal),
  });
export function useDatasetQuery(connection: Connection, enabled = true) {
  return useQuery({ ...datasetQueryOptions(connection), enabled });
}
export function useDataCentersQuery(connection: Connection, enabled = true) {
  return useQuery({
    queryKey: ["data-centers", connectionKey(connection)],
    queryFn: ({ signal }) => loadDataCenters(connection, signal),
    enabled,
  });
}
export function useDataCenterDetailsQuery(
  connection: Connection | null,
  id: number,
  mode: string,
  version: number,
) {
  return useQuery({
    queryKey: ["detail", connectionKey(connection), mode, version, id],
    queryFn: ({ signal }) => {
      if (!connection) throw new Error("Conexão não configurada.");
      return loadDetails(connection, id, signal);
    },
    enabled: mode === "real" && !!connection,
  });
}
