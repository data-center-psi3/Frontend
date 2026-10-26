import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { datasetQueryOptions, useDatasetQuery } from "../queries/dataset";
import { connection } from "../config/connection";
import { emptyFilters } from "../components/filters/FilterPanel";
import { csv, filterCenters, filterIndicators } from "../utils/data";
import type { Dataset, Filters } from "../types/api";

const blank: Dataset = {
  centers: [],
  indicators: [],
  sources: [],
  benefits: [],
  research: [],
  points: [],
  dashboard: [],
};

export function useAppData(
  isLearning: boolean,
  isRadar: boolean,
  pathname: string,
  search: string,
) {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  useEffect(() => {
    const params = new URLSearchParams(search);
    const center = params.get("center");
    if (params.get("from") === "radar") setFilters(emptyFilters);
    else if (center) setFilters((current) => ({ ...current, center }));
  }, [pathname, search]);
  const query = useDatasetQuery(
    connection,
    pathname !== "/noticias" &&
      !isLearning &&
      (!isRadar || pathname === "/mapa"),
  );
  const data = query.data ?? blank;
  const centers = filterCenters(data.centers, filters);
  const indicators = filterIndicators(
    data.indicators,
    centers,
    filters.period,
  ).filter((i) => !filters.indicator || i.tipo === filters.indicator);
  function exportData() {
    const content = csv(
      indicators.map((i) => ({
        instalacao: data.centers.find((c) => c.id === i.dataCenterId)?.nome,
        indicador: i.tipo,
        valor: i.valor,
        unidade: i.unidade,
        periodo: i.periodo,
        fonte: data.sources.find((s) => s.id === i.fonteId)?.titulo,
        observacoes: i.observacoes,
        origem: "API local",
      })),
    );
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "dataterra-indicadores.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  async function ensureLocations() {
    await queryClient.fetchQuery({
      ...datasetQueryOptions(connection),
      staleTime: Infinity,
    });
  }

  return {
    query,
    data,
    centers,
    indicators,
    filters,
    setFilters,
    exportData,
    ensureLocations,
  };
}
