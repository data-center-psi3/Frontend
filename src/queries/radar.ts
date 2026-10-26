import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Connection } from "../types/api";
import type { RadarFilters, RadarMetric } from "../types/radar";
import { importedRadarModel } from "../adapters/importedRadar";
import { radarService } from "../services/radar";
import { connectionKey } from "./keys";
import { useImportedCentersQuery } from "./imports";
import { useDataCentersQuery } from "./dataset";

export function useRadarQueries({
  connection,
  filters,
  metric,
  validUf,
  useImports,
  isolatedApi,
}: {
  connection: Connection;
  filters: RadarFilters;
  metric: RadarMetric;
  validUf: boolean;
  useImports: boolean;
  isolatedApi: boolean;
}) {
  const imported = useImportedCentersQuery(connection, useImports);
  const importedModel = useMemo(
    () => importedRadarModel(imported.data ?? []),
    [imported.data],
  );
  const service = useMemo(
    () => (useImports ? importedModel.service : radarService(connection)),
    [useImports, importedModel, connection],
  );
  const ready = !useImports || imported.isSuccess;
  const baseKey = [
    "radar",
    connectionKey(connection),
    useImports ? `imports:${imported.dataUpdatedAt}` : "api",
  ];
  const regionFilters = { ...filters, uf: "" };
  const overview = useQuery({
    queryKey: [...baseKey, "overview", filters],
    queryFn: ({ signal }) => service.overview(filters, signal),
    enabled: validUf && ready,
  });
  const states = useQuery({
    queryKey: [...baseKey, "states", regionFilters],
    queryFn: ({ signal }) =>
      service.states(regionFilters, "installations", signal),
    enabled: validUf && ready,
  });
  const options = useQuery({
    queryKey: [...baseKey, "filters"],
    queryFn: ({ signal }) => service.filters(signal),
    staleTime: 300000,
    enabled: ready,
  });
  const detail = useQuery({
    queryKey: [...baseKey, "state", filters],
    queryFn: ({ signal }) => service.state(filters.uf, filters, signal),
    enabled: validUf && !!filters.uf && ready,
  });
  const cities = useQuery({
    queryKey: [...baseKey, "cities", filters],
    queryFn: ({ signal }) =>
      filters.uf
        ? service.cities(filters.uf, filters, "installations", signal)
        : service.cityRanking(filters, "installations", signal),
    enabled: validUf && ready,
  });
  const operatorSort = metric === "networks" ? "networks" : "installations";
  const operators = useQuery({
    queryKey: [...baseKey, "operators", filters, operatorSort],
    queryFn: ({ signal }) => service.operators(filters, operatorSort, signal),
    enabled: validUf && ready,
  });
  const points = useQuery({
    queryKey: [...baseKey, "map", filters],
    queryFn: ({ signal }) => service.points(filters, signal),
    enabled: validUf && ready,
  });
  const installations = useDataCentersQuery(
    connection,
    validUf && !!filters.uf && !isolatedApi,
  );
  return {
    imported,
    importedModel,
    overview,
    states,
    options,
    detail,
    cities,
    operators,
    points,
    installations,
  };
}
