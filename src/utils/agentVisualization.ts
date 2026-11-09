import type { DataRow, DataValue, Field, VisualizationResult, VisualizationSpec, ChartType } from "../types/agentVisualization";

const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown, fallback = "") => typeof v === "string" ? v : fallback;
const own = (row: DataRow, key: string) => Object.prototype.hasOwnProperty.call(row, key);
export function readRows(value: unknown): DataRow[] {
  if (!Array.isArray(value) || !value.every(object)) throw new Error("Linhas de dados inválidas.");
  return value.map((row) => {
    const safe = Object.create(null) as DataRow;
    for (const [key, cell] of Object.entries(row)) {
      if (["__proto__", "constructor", "prototype"].includes(key)) continue;
      if (cell !== null && typeof cell !== "string" && typeof cell !== "boolean" && !(typeof cell === "number" && Number.isFinite(cell)))
        throw new Error("A visualização contém valores não suportados.");
      safe[key] = cell as DataValue;
    }
    return safe;
  });
}
function field(raw: unknown): Field {
  if (!object(raw) || typeof raw.field !== "string" || !raw.field || ["__proto__", "constructor", "prototype"].includes(raw.field)) throw new Error("Campo de visualização inválido.");
  if (!["nominal", "quantitative", "temporal", "unknown"].includes(String(raw.type))) throw new Error("Tipo de campo inválido.");
  if (raw.format !== undefined && !["", "integer", "decimal", "percent"].includes(String(raw.format))) throw new Error("Formato de campo inválido.");
  if (raw.fields !== undefined && (!Array.isArray(raw.fields) || !raw.fields.length || !raw.fields.every((v) => typeof v === "string") || raw.fields.length > 20)) throw new Error("Séries inválidas.");
  return { field: raw.field, title: text(raw.title, raw.field), type: raw.type as Field["type"], format: raw.format ? raw.format as Field["format"] : undefined, unit: text(raw.unit), fields: raw.fields as string[] | undefined };
}
export function visualizationPayloads(raw: { visualizations?: unknown; visualization?: unknown; chartData?: unknown }): unknown[] {
  const value = raw.visualizations ?? raw.visualization ?? raw.chartData;
  return value == null ? [] : Array.isArray(value) ? value : [value];
}
export function validateVisualization(raw: unknown): VisualizationResult {
  let fallback: VisualizationSpec | undefined;
  try {
    if (!object(raw)) throw new Error("Especificação de visualização inválida.");
    const data = readRows(raw.data ?? raw.rows ?? []);
    const inferred: Field[] = [...new Set(data.flatMap(Object.keys))].map((key) => ({ field: key, title: key, type: data.some((r) => typeof r[key] === "number") ? "quantitative" : "nominal" }));
    const metadata = object(raw.metadata) ? raw.metadata : {};
    const total = metadata.totalRecords ?? raw.totalElements;
    const spec: VisualizationSpec = {
      schemaVersion: "1.0", type: "table", title: text(raw.title, "Dados da resposta"), description: text(raw.description),
      data, columns: inferred, datasetId: typeof raw.datasetId === "string" ? raw.datasetId : undefined,
      metadata: { totalRecords: typeof total === "number" && total >= 0 ? total : undefined, complete: (metadata.complete ?? raw.complete) === true && !(typeof total === "number" && total > data.length),
        status: text(metadata.status), message: text(metadata.message), warning: text(metadata.warning), source: text(metadata.source), dataEndpoint: text(metadata.dataEndpoint), percentageScope: text(metadata.percentageScope) },
    };
    fallback = spec;
    if (raw.schemaVersion !== "1.0") throw new Error("Versão de visualização não suportada.");
    if (raw.type !== "chart" && raw.type !== "table") throw new Error("Representação não suportada.");
    spec.columns = Array.isArray(raw.columns) ? raw.columns.map(field) : inferred;
    spec.type = raw.type;
    if (spec.type === "chart") {
      if (!["bar", "horizontalBar", "line", "area", "pie", "doughnut", "scatter"].includes(String(raw.chartType))) throw new Error("Tipo de gráfico não suportado. Consulte os dados em tabela.");
      spec.chartType = raw.chartType as ChartType;
      const circular = spec.chartType === "pie" || spec.chartType === "doughnut";
      const encoding = object(raw.encoding) ? raw.encoding : {};
      const aliasAxis = (name: unknown, existing: unknown, type: Field["type"]) => {
        if (!circular || typeof name !== "string") return existing;
        return { ...(object(existing) ? existing : {}), ...(spec.columns.find((column) => column.field === name) ?? {}), field: name, type, title: spec.columns.find((column) => column.field === name)?.title ?? name };
      };
      const x = field(aliasAxis(raw.dimension, encoding.x, "nominal")), y = field(aliasAxis(raw.metric, encoding.y, "quantitative"));
      const declaredColor = encoding.color == null ? undefined : field(encoding.color);
      // Circular colors identify slices, not separate metric series.
      const color = circular ? undefined : declaredColor;
      if (y.type !== "quantitative") throw new Error("O eixo de valores deve ser numérico.");
      const metrics = y.fields ?? [y.field];
      if (metrics.length * Math.max(1, color ? new Set(data.map((r) => r[color.field])).size : 1) > 20) throw new Error("Muitas séries. Consulte os dados em tabela.");
      for (const axis of [x, y, ...(color ? [color] : [])]) {
        if (data.length && !data.some((row) => own(row, axis.field))) throw new Error(`Campo ausente: ${axis.field}.`);
      }
      for (const key of [...metrics, ...(x.type === "quantitative" ? [x.field] : [])]) {
        if (data.length && !data.some((row) => own(row, key))) throw new Error(`Campo ausente: ${key}.`);
        if (data.some((row) => row[key] != null && typeof row[key] !== "number")) throw new Error(`O campo ${key} contém valores não numéricos.`);
      }
      if (raw.chartType === "scatter" && x.type !== "quantitative") throw new Error("Dispersão exige dois eixos numéricos.");
      if (color && new Set(data.map((r) => r[color.field])).size > 20) throw new Error("Muitas séries. Consulte os dados em tabela.");
      if (circular && (metrics.length !== 1 || data.some((r) => typeof r[y.field] === "number" && Number(r[y.field]) < 0))) throw new Error("Pizza e rosca exigem uma métrica não negativa.");
      spec.encoding = { x, y, color };
      spec.legend = { visible: object(raw.legend) ? raw.legend.visible === true : !!color || metrics.length > 1 };
    }
    return { spec };
  } catch (cause) {
    return { error: cause instanceof Error ? cause.message : "Visualização inválida.", fallback: fallback ? { ...fallback, type: "table", encoding: undefined } : undefined };
  }
}
export function formatDataValue(value: DataValue | undefined, column?: Field): string {
  if (value == null) return "—";
  if (typeof value === "number") return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: column?.format === "integer" ? 0 : 2, ...(column?.format === "percent" ? { style: "percent" as const } : {}) }).format(value) + (column?.unit ? ` ${column.unit}` : "");
  if (column?.type === "temporal" && typeof value === "string") {
    if (/^\d{4}(?:-\d{2})?$/.test(value)) return value;
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
  }
  return typeof value === "boolean" ? (value ? "Sim" : "Não") : String(value);
}
export function csvData(rows: DataRow[], columns: Field[]): string {
  const cell = (value: unknown) => {
    let result = value == null ? "" : String(value);
    if (/^[\s]*[=+\-@]/.test(result)) result = `'${result}`;
    return `"${result.replace(/"/g, '""')}"`;
  };
  return "\uFEFF" + [columns.map((c) => cell(c.title)).join(";"), ...rows.map((r) => columns.map((c) => cell(r[c.field])).join(";"))].join("\r\n");
}
export function downloadFile(content: BlobPart, mime: string, name: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
