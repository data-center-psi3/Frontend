import type { Indicator } from "../types/api";
import { categoryOf, normalize } from "./data";
// An installation's consumption cannot be inferred from PUE/WUE efficiency indices.
export function consumptionRecords(indicators: Indicator[], category: string) {
  return indicators.filter(
    (i) =>
      categoryOf(i.tipo) === category &&
      !/^(pue|wue)\b/.test(normalize(i.tipo)),
  );
}
export function representativeRecord(
  indicators: Indicator[],
): Indicator | undefined {
  const numeric = indicators.filter(
    (i) => i.valor != null && Number.isFinite(i.valor),
  );
  // A single representative is explicitly identified; never imply a total from mixed records.
  return numeric.sort(
    (a, b) => (b.periodo ?? "").localeCompare(a.periodo ?? "") || a.id - b.id,
  )[0];
}
export function annualSeries(
  indicators: Indicator[],
  centerId: number,
  type: string,
  unit: string,
) {
  const records = indicators
    .filter(
      (i) =>
        i.dataCenterId === centerId &&
        i.tipo === type &&
        i.unidade === unit &&
        i.valor != null &&
        i.periodo &&
        /^\d{4}$/.test(i.periodo),
    )
    .sort((a, b) => a.periodo!.localeCompare(b.periodo!));
  if (new Set(records.map((i) => i.periodo)).size !== records.length) return [];
  return records.map((i) => ({ name: i.periodo!, value: i.valor! }));
}
