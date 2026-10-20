import type { DataCenter, Filters, Indicator } from "../types/api";
export const MISSING_VALUE = "Não informado";
export function isMissing(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "number") return !Number.isFinite(value);
  if (typeof value !== "string") return false;
  const token = value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return (
    !token ||
    /^[-_–—.]+$/.test(token) ||
    /^(null|undefined|none|nan|n\s*[/.]?\s*[ad]\.?|nao informad[oa]s?\.?|nao disponiv(?:el|eis)|sem informac(?:ao|oes)|nao cadastrad[oa])$/.test(
      token,
    )
  );
}
export function displayValue(value: unknown): string {
  return isMissing(value) ? MISSING_VALUE : String(value).trim();
}
export const number = (value: number | null | undefined, digits = 4) =>
  value == null || !Number.isFinite(value)
    ? MISSING_VALUE
    : new Intl.NumberFormat("pt-BR", { maximumFractionDigits: digits }).format(
        value,
      );
export const date = (value: string | null) =>
  isMissing(value)
    ? MISSING_VALUE
    : /^\d{4}-\d{2}-\d{2}$/.test(value!.trim())
      ? value!.trim().split("-").reverse().join("/")
      : displayValue(value);
export const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export const safeUrl = (url: string | null) => {
  try {
    const parsed = new URL(url ?? "");
    return ["http:", "https:"].includes(parsed.protocol)
      ? parsed.href
      : undefined;
  } catch {
    return undefined;
  }
};
export function filterCenters(centers: DataCenter[], filters: Filters) {
  return centers.filter(
    (c) =>
      (!filters.country || c.pais === filters.country) &&
      (!filters.state || c.estado === filters.state) &&
      (!filters.city || c.cidade === filters.city) &&
      (!filters.center || String(c.id) === filters.center) &&
      (!filters.search ||
        normalize(`${c.nome} ${c.empresa ?? ""} ${c.cidade}`).includes(
          normalize(filters.search),
        )),
  );
}
export function filterIndicators(
  indicators: Indicator[],
  centers: DataCenter[],
  period: string,
) {
  const ids = new Set(centers.map((c) => c.id));
  return indicators.filter(
    (i) => ids.has(i.dataCenterId) && (!period || i.periodo === period),
  );
}
export const categories = [
  {
    key: "energia",
    label: "Energia",
    unit: "MWh",
    description:
      "Energia elétrica consumida no período informado. Potência em MW não equivale a consumo.",
    matches: ["energia", "eletric", "pue"],
  },
  {
    key: "agua",
    label: "Água",
    unit: "m³",
    description:
      "Água utilizada, principalmente na refrigeração. WUE descreve a eficiência no uso da água.",
    matches: ["agua", "wue"],
  },
  {
    key: "emissoes",
    label: "Emissões",
    unit: "tCO₂e",
    description:
      "Gases de efeito estufa expressos em dióxido de carbono equivalente.",
    matches: ["emiss", "carbon", "co2", "gee"],
  },
  {
    key: "residuos",
    label: "Resíduos",
    unit: "t",
    description:
      "Registros sobre equipamentos descartados e resíduos eletroeletrônicos.",
    matches: ["residu", "descarte"],
  },
  {
    key: "recursos",
    label: "Recursos naturais",
    unit: "",
    description:
      "Materiais e recursos naturais associados à construção e à infraestrutura digital.",
    matches: ["recurso", "material", "minera"],
  },
];
export const categoryOf = (type: string) =>
  categories.find((c) => c.matches.some((m) => normalize(type).includes(m)))
    ?.key ?? "outros";
// Separate type, unit AND period. No addition of unlike measures or reporting periods.
export function groups(indicators: Indicator[]) {
  const result = new Map<string, Indicator[]>();
  indicators.forEach((i) => {
    const key = JSON.stringify([i.tipo, i.unidade, i.periodo]);
    result.set(key, [...(result.get(key) ?? []), i]);
  });
  return [...result.values()];
}
export function comparableGroups(indicators: Indicator[]) {
  return groups(
    indicators.filter(
      (i) =>
        i.valor != null &&
        Number.isFinite(i.valor) &&
        !isMissing(i.unidade) &&
        !isMissing(i.periodo),
    ),
  );
}
export function csv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  const cell = (v: unknown) => {
    let s = String(v ?? "");
    if (typeof v === "string" && /^[=+@\-]/.test(s)) s = `'${s}`;
    return `"${s.replaceAll('"', '""')}"`;
  };
  return (
    "\uFEFF" +
    [
      keys.map(cell).join(";"),
      ...rows.map((row) => keys.map((k) => cell(row[k])).join(";")),
    ].join("\r\n")
  );
}
