import type { ImportedDataCenter } from "../types/imports";
import type {
  RadarCity,
  RadarFilters,
  RadarPoint,
  RadarState,
  RadarConnectivity,
  RadarMetric,
} from "../types/radar";
import type { radarService } from "./radar";
import { normalize, displayValue, isMissing } from "../utils/data";
import { stateKey, stateName } from "../utils/geography";
import {
  radarRegion,
  rankRadar,
  ufCodes,
  validRadarPoint,
} from "../utils/radar";

const text = (value: unknown): string | null => {
  if (isMissing(value)) return null;
  const clean = String(value).replace(/\s+/g, " ").trim();
  return ["desconhecido", "nao informado na base"].includes(normalize(clean))
    ? null
    : clean;
};
const key = (value: unknown) => {
  const clean = text(value);
  return clean === null ? null : normalize(clean);
};
export function importedCoordinate(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || !/^[+-]?\d+(?:[.,]\d+)?$/.test(value.trim()))
    return null;
  const parsed = Number(value.trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}
export function importedCount(value: unknown): number | null {
  const clean =
    typeof value === "number"
      ? String(value)
      : typeof value === "string"
        ? value.trim()
        : "";
  if (!/^\d{1,30}$/.test(clean)) return null;
  const parsed = Number(clean);
  return Number.isSafeInteger(parsed) ? parsed : null;
}
type RecordRow = RadarPoint & {
  codigoIbge: string | null;
  cityKey: string | null;
};
function sum(values: (number | null)[]) {
  const valid = values.filter((value): value is number => value !== null);
  if (!valid.length) return null;
  const total = valid.reduce((a, b) => a + b, 0);
  return Number.isSafeInteger(total) ? total : null;
}
function connectivity(rows: RecordRow[]): RadarConnectivity {
  const networks = rows.map((row) => row.redesConectadas),
    ix = rows.map((row) => row.ixConectados),
    carriers = rows.map((row) => row.carriers);
  const count = (values: (number | null)[]) =>
    values.filter((value) => value !== null).length;
  const average = (values: (number | null)[]) => {
    const total = sum(values);
    return total === null
      ? null
      : Math.round((total / count(values)) * 100) / 100;
  };
  return {
    totalRedesRegistradas: sum(networks),
    mediaRedesPorInstalacao: average(networks),
    totalIxRegistrados: sum(ix),
    mediaIxPorInstalacao: average(ix),
    totalCarriersRegistrados: sum(carriers),
    mediaCarriersPorInstalacao: average(carriers),
    instalacoesComConectividade: rows.filter((row) =>
      [row.redesConectadas, row.ixConectados, row.carriers].some(
        (value) => value !== null,
      ),
    ).length,
    instalacoesComRedes: count(networks),
    instalacoesComIx: count(ix),
    instalacoesComCarriers: count(carriers),
  };
}
const distinct = (
  rows: RecordRow[],
  field: (row: RecordRow) => string | null,
) => new Set(rows.map(field).filter((value) => value !== null)).size;
function overview(rows: RecordRow[]) {
  const c = connectivity(rows);
  return {
    totalInstalacoes: rows.length,
    totalOperadores: distinct(rows, (row) => key(row.operador)),
    totalMunicipios: distinct(rows, (row) => row.cityKey),
    totalEstados: distinct(rows, (row) => row.uf),
    instalacoesComCoordenadas: rows.filter(validRadarPoint).length,
    totalRedesRegistradas: c.totalRedesRegistradas,
    totalIxRegistrados: c.totalIxRegistrados,
    totalCarriersRegistrados: c.totalCarriersRegistrados,
    conectividade: c,
  };
}
function groups(rows: RecordRow[], field: (row: RecordRow) => string | null) {
  const result = new Map<string, RecordRow[]>();
  for (const row of rows) {
    const value = field(row);
    if (value !== null) result.set(value, [...(result.get(value) ?? []), row]);
  }
  return [...result.entries()].sort(([a], [b]) => a.localeCompare(b, "pt-BR"));
}
/** Adapter for the populated /importacoes contract. No fallback from empty /radar responses. */
export function importedRadarModel(raw: ImportedDataCenter[]) {
  const rows: RecordRow[] = raw
    .map((row, index) => {
      const uf = stateKey(text(row.uf) ?? "");
      const prefix = Object.entries(ufCodes).find(
        ([, code]) => code === uf,
      )?.[0];
      const ibge = text(row.codigoIbge);
      const codigoIbge =
        ibge && /^\d{7}$/.test(ibge) && ibge.startsWith(prefix ?? "invalid")
          ? ibge
          : null;
      const city = key(row.municipio);
      return {
        id: -(index + 1),
        sourceId: text(row.idOriginal),
        sourceUrl: text(row.fonteUrl),
        unidade: displayValue(text(row.unidade)),
        operador: text(row.operador),
        municipio: displayValue(text(row.municipio)),
        uf,
        latitude: importedCoordinate(row.latitude),
        longitude: importedCoordinate(row.longitude),
        tipoInstalacao: text(row.tipoInstalacao),
        precisaoGeo: text(row.precisaoGeo),
        redesConectadas: importedCount(row.redesConectadas),
        ixConectados: importedCount(row.ixConectados),
        carriers: importedCount(row.carriers),
        codigoIbge,
        cityKey: codigoIbge
          ? `${uf}:${codigoIbge}`
          : city
            ? `${uf}:${city}`
            : null,
      };
    })
    .filter((row) => Object.values(ufCodes).includes(row.uf));
  const filter = (f: RadarFilters) =>
    rows.filter(
      (row) =>
        (!f.uf || row.uf === stateKey(f.uf)) &&
        (!f.region || key(radarRegion(row.uf)) === key(f.region)) &&
        (!f.operator || key(row.operador) === key(f.operator)) &&
        (!f.installationType ||
          key(row.tipoInstalacao) === key(f.installationType)),
    );
  const state = (uf: string, items: RecordRow[]): RadarState => {
    const data = overview(items);
    return {
      ...data,
      uf,
      participacaoNacional: rows.length
        ? Math.round((items.length / rows.length) * 10000) / 100
        : 0,
      mediaRedesPorInstalacao: data.conectividade.mediaRedesPorInstalacao,
    };
  };
  const cities = (items: RecordRow[], metric: RadarMetric): RadarCity[] =>
    rankRadar(
      groups(items, (row) => row.cityKey).map(([, group]) => ({
        ...overview(group),
        municipio: group[0].municipio,
        uf: group[0].uf,
        codigoIbge: group[0].codigoIbge,
      })),
      metric,
    );
  const operators = (items: RecordRow[], metric: RadarMetric) =>
    groups(items, (row) => key(row.operador))
      .map(([, group]) => ({
        operador: group[0].operador!,
        ...overview(group),
      }))
      .sort((a, b) => {
        const x =
            metric === "networks"
              ? a.totalRedesRegistradas
              : a.totalInstalacoes,
          y =
            metric === "networks"
              ? b.totalRedesRegistradas
              : b.totalInstalacoes;
        return x === null ? (y === null ? 0 : 1) : y === null ? -1 : y - x;
      })
      .slice(0, 10);
  const options = (field: (row: RecordRow) => unknown) => {
    const values = new Map<string, string>();
    for (const row of rows) {
      const clean = text(field(row));
      if (clean !== null && !values.has(key(clean)!))
        values.set(key(clean)!, clean);
    }
    return [...values.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
  };
  const service: ReturnType<typeof radarService> = {
    overview: async (f) => overview(filter(f)),
    states: async (f, metric) =>
      rankRadar(
        groups(filter(f), (row) => row.uf).map(([uf, items]) =>
          state(uf, items),
        ),
        metric,
      ),
    state: async (uf, f) => {
      const items = filter({ ...f, uf });
      return {
        uf,
        nome: stateName(uf),
        indicadores: state(uf, items),
        operadores: operators(items, "installations"),
        municipios: cities(items, "installations"),
      };
    },
    cities: async (uf, f, metric) => cities(filter({ ...f, uf }), metric),
    operators: async (f, metric) => operators(filter(f), metric),
    cityRanking: async (f, metric) => cities(filter(f), metric),
    points: async (f) => filter(f).filter(validRadarPoint),
    filters: async () => ({
      states: options((row) => row.uf),
      operators: options((row) => row.operador),
      installationTypes: options((row) => row.tipoInstalacao),
      regions: options((row) => radarRegion(row.uf)),
    }),
  };
  return { service, records: filter, excludedRows: raw.length - rows.length };
}
