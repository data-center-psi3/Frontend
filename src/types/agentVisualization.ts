export type DataValue = string | number | boolean | null;
export type DataRow = Record<string, DataValue>;
export type FieldType = "nominal" | "quantitative" | "temporal" | "unknown";
export type Field = { field: string; title: string; type: FieldType; format?: "integer" | "decimal" | "percent"; unit?: string; fields?: string[] };
export type ChartType = "bar" | "horizontalBar" | "line" | "area" | "pie" | "doughnut" | "scatter";
export type VisualizationSpec = {
  schemaVersion: "1.0";
  type: "table" | "chart";
  title: string;
  description: string;
  datasetId?: string;
  chartType?: ChartType;
  columns: Field[];
  data: DataRow[];
  encoding?: { x: Field; y: Field; color?: Field };
  legend?: { visible: boolean };
  metadata: { totalRecords?: number; complete: boolean; status?: string; message?: string; warning?: string; dataEndpoint?: string; source?: string; percentageScope?: string };
};
export type VisualizationResult = { spec: VisualizationSpec; error?: string } | { spec?: undefined; error: string; fallback?: VisualizationSpec };
