import { useQuery } from "@tanstack/react-query";
import type { Connection } from "../types/api";
import { loadImportedCenters } from "../services/imports";
import { connectionKey } from "./keys";

export const importedCentersQueryKey = (connection: Connection | null) =>
  ["imported-centers", connectionKey(connection)] as const;

export function useImportedCentersQuery(
  connection: Connection | null,
  enabled = true,
) {
  return useQuery({
    queryKey: importedCentersQueryKey(connection),
    queryFn: ({ signal }) => {
      if (!connection) throw new Error("Conexão não configurada.");
      return loadImportedCenters(connection, signal);
    },
    enabled: !!connection && enabled,
  });
}
