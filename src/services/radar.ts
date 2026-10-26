import { apiRoutes } from "./api";
import { createApi } from "./http/client";
import type { Connection } from "../types/api";
import type {
  RadarFilters,
  RadarMetric,
  RadarOverview,
  RadarState,
  RadarStateDetail,
  RadarCity,
  RadarOperator,
  RadarPoint,
  RadarFilterOptions,
} from "../types/radar";

export function radarService(connection: Connection) {
  const client = createApi(connection);
  async function get<T>(
    path: string,
    filters: Partial<RadarFilters> = {},
    signal?: AbortSignal,
    extra = {},
  ) {
    const params = Object.fromEntries(
      Object.entries({ ...filters, ...extra }).filter(
        ([, value]) => value !== "" && value != null,
      ),
    );
    const { data } = await client.get<T>(path, { params, signal });
    if (data == null || typeof data !== "object")
      throw new Error("Resposta incompatível com o contrato do Radar.");
    return data;
  }
  async function list<T>(
    path: string,
    filters: Partial<RadarFilters>,
    signal?: AbortSignal,
    extra = {},
  ) {
    const data = await get<T[]>(path, filters, signal, extra);
    if (!Array.isArray(data))
      throw new Error(
        "O Radar deve retornar uma lista, sem envelope de paginação.",
      );
    return data;
  }
  return {
    overview: (f: RadarFilters, s?: AbortSignal) =>
      get<RadarOverview>(apiRoutes.radar.overview, f, s),
    states: (f: RadarFilters, metric: RadarMetric, s?: AbortSignal) =>
      list<RadarState>(apiRoutes.radar.states, f, s, { sortBy: metric }),
    state: (uf: string, f: RadarFilters, s?: AbortSignal) =>
      get<RadarStateDetail>(apiRoutes.radar.state(uf), f, s),
    cities: (
      uf: string,
      f: RadarFilters,
      metric: RadarMetric,
      s?: AbortSignal,
    ) =>
      list<RadarCity>(apiRoutes.radar.cities(uf), f, s, {
        sortBy: metric === "averageNetworks" ? "networks" : metric,
      }),
    operators: (f: RadarFilters, metric: RadarMetric, s?: AbortSignal) =>
      list<RadarOperator>(apiRoutes.radar.operators, f, s, {
        sortBy: ["networks", "averageNetworks", "ix", "carriers"].includes(
          metric,
        )
          ? "networks"
          : "installations",
        limit: 10,
      }),
    cityRanking: (f: RadarFilters, metric: RadarMetric, s?: AbortSignal) =>
      list<RadarCity>(apiRoutes.radar.cityRanking, f, s, {
        sortBy: metric === "averageNetworks" ? "networks" : metric,
        limit: 1000,
      }),
    points: (f: RadarFilters, s?: AbortSignal) =>
      list<RadarPoint>(apiRoutes.radar.points, f, s),
    filters: (s?: AbortSignal) =>
      get<RadarFilterOptions>(apiRoutes.radar.filters, {}, s),
  };
}
