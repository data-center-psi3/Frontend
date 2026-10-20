import type {
  RadarCity,
  RadarState,
  RadarPoint,
  RadarMetric,
} from "../types/radar";

export const ufCodes: Record<string, string> = {
  "11": "RO",
  "12": "AC",
  "13": "AM",
  "14": "RR",
  "15": "PA",
  "16": "AP",
  "17": "TO",
  "21": "MA",
  "22": "PI",
  "23": "CE",
  "24": "RN",
  "25": "PB",
  "26": "PE",
  "27": "AL",
  "28": "SE",
  "29": "BA",
  "31": "MG",
  "32": "ES",
  "33": "RJ",
  "35": "SP",
  "41": "PR",
  "42": "SC",
  "43": "RS",
  "50": "MS",
  "51": "MT",
  "52": "GO",
  "53": "DF",
};
export const radarMetrics = {
  installations: { label: "Instalações", unit: "instalações cadastradas" },
  operators: { label: "Operadores", unit: "operadores distintos" },
  networks: { label: "Redes registradas", unit: "redes registradas (soma)" },
  averageNetworks: {
    label: "Média de redes",
    unit: "redes por instalação com dado válido",
  },
  ix: { label: "IX registrados", unit: "IX registrados (soma)" },
  carriers: {
    label: "Carriers registrados",
    unit: "carriers registrados (soma)",
  },
};
export function validNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
export function radarValue(
  row: RadarState | RadarCity,
  metric: RadarMetric,
): number | null {
  const field =
    metric === "installations"
      ? row.totalInstalacoes
      : metric === "operators"
        ? row.totalOperadores
        : metric === "networks"
          ? row.totalRedesRegistradas
          : metric === "ix"
            ? row.totalIxRegistrados
            : metric === "carriers"
              ? row.totalCarriersRegistrados
              : row.conectividade?.mediaRedesPorInstalacao;
  return validNumber(field) ? field : null;
}
export function rankRadar<T extends RadarState | RadarCity>(
  rows: T[],
  metric: RadarMetric,
) {
  return [...rows].sort((a, b) => {
    const x = radarValue(a, metric),
      y = radarValue(b, metric);
    return x === null ? (y === null ? 0 : 1) : y === null ? -1 : y - x;
  });
}
export function validRadarPoint(point: RadarPoint) {
  return (
    typeof point.latitude === "number" &&
    typeof point.longitude === "number" &&
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    Math.abs(point.latitude) <= 90 &&
    Math.abs(point.longitude) <= 180
  );
}
export function heatWeight(
  point: RadarPoint,
  metric: RadarMetric,
): number | null {
  if (metric === "installations") return 1;
  const value =
    metric === "networks"
      ? point.redesConectadas
      : metric === "ix"
        ? point.ixConectados
        : metric === "carriers"
          ? point.carriers
          : null;
  return validNumber(value) ? value : null;
}
export const heatSupported = (metric: RadarMetric) =>
  !["operators", "averageNetworks"].includes(metric);
export const radarPalette = [
  "#d1fae5",
  "#6ee7b7",
  "#34d399",
  "#059669",
  "#065f46",
];
export function radarBucket(value: number, max: number) {
  return max > 0
    ? Math.min(4, Math.max(0, Math.ceil((value / max) * 5) - 1))
    : 0;
}

export function radarRegion(uf: string) {
  if (["AC", "AP", "AM", "PA", "RO", "RR", "TO"].includes(uf)) return "Norte";
  if (["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"].includes(uf))
    return "Nordeste";
  if (["DF", "GO", "MT", "MS"].includes(uf)) return "Centro-Oeste";
  if (["ES", "MG", "RJ", "SP"].includes(uf)) return "Sudeste";
  if (["PR", "RS", "SC"].includes(uf)) return "Sul";
  return "";
}
