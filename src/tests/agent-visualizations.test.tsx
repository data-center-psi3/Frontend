import { cloneElement, type ReactElement } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AgentResponse } from "../components/AgentResponse";
import { VisualizationRenderer } from "../components/ai/visualizations/VisualizationRenderer";
import { DynamicTable } from "../components/ai/visualizations/DynamicTable";
import { validateVisualization, visualizationPayloads, csvData, formatDataValue } from "../utils/agentVisualization";
import { getVisualizationPage } from "../services/agent";
import type { VisualizationSpec } from "../types/agentVisualization";

vi.mock("recharts", async (original) => ({ ...await original<typeof import("recharts")>(), ResponsiveContainer: ({ children }: { children: ReactElement }) => cloneElement(children, { width: 640, height: 300 } as object) }));
vi.mock("../services/agent", () => ({ getVisualizationPage: vi.fn() }));

const columns: VisualizationSpec["columns"] = [{ field: "categoria", title: "Categoria", type: "nominal" }, { field: "valor", title: "Valor", type: "quantitative" }];
const fixture = (overrides: Partial<VisualizationSpec> = {}): VisualizationSpec => ({ schemaVersion: "1.0", type: "chart", chartType: "bar", title: "Dados reais", description: "Conforme a fonte", columns,
  data: [{ categoria: "A", valor: 12 }, { categoria: "B", valor: 4 }], encoding: { x: columns[0], y: columns[1] }, metadata: { complete: true, totalRecords: 2 }, ...overrides });
beforeEach(() => vi.mocked(getVisualizationPage).mockReset());

describe("Dynamic visualizations", () => {
  it.each(["pie", "doughnut"] as const)("renders all 25 categories of %s without treating colors as metric series", async (chartType) => {
    const data = Array.from({ length: 25 }, (_, index) => ({ estado: `UF ${index + 1}`, quantidade: 25 - index }));
    const raw = { schemaVersion: "1.0", type: "chart", chartType, dimension: "estado", metric: "quantidade", complete: true, data,
      encoding: { x: { field: "estado", type: "nominal" }, y: { field: "quantidade", type: "quantitative" }, color: { field: "estado", type: "nominal" } } };
    const validated = validateVisualization(raw);
    expect(validated.error).toBeUndefined();
    expect(validated.spec?.type).toBe("chart");
    expect(validated.spec?.data).toHaveLength(25);
    const { container } = render(<VisualizationRenderer specification={raw} />);
    await waitFor(() => expect(container.querySelectorAll(".recharts-pie-sector")).toHaveLength(25));
    const legend = screen.getByRole("list", { name: "Categorias do gráfico de pizza" });
    expect(within(legend).getAllByRole("listitem")).toHaveLength(25);
    expect(within(legend).getByText("UF 25")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByText(/Muitas séries/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Ver tabela" }));
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("1–10 de 25 registros carregados")).toBeInTheDocument();
  });
  it("maps dimension and metric for pie payloads without encoding, including different field names", () => {
    const result = validateVisualization({ schemaVersion: "1.0", type: "chart", chartType: "pie", dimension: "operador", metric: "potencia", complete: true, data: [{ operador: "A", potencia: 12 }, { operador: "B", potencia: 3 }] });
    expect(result.error).toBeUndefined();
    expect(result.spec?.encoding?.x.field).toBe("operador");
    expect(result.spec?.encoding?.y.field).toBe("potencia");
  });
  it("keeps the cartesian metric series limit without applying it to pie slices", () => {
    const spec = fixture({ data: Array.from({ length: 25 }, (_, index) => ({ categoria: String(index), valor: index })) });
    spec.encoding!.color = columns[0];
    expect(validateVisualization(spec).error).toMatch(/Muitas séries/);
    expect(validateVisualization({ ...spec, chartType: "pie" }).error).toBeUndefined();
  });
  it("preserves ordinary text and null payloads", () => {
    expect(visualizationPayloads({ chartData: null })).toEqual([]);
    render(<AgentResponse response="Resposta **textual**." />);
    expect(screen.getByText("textual").tagName).toBe("STRONG");
  });
  it("prefers visualization over the legacy alias and preserves multiple specifications", () => {
    const spec = fixture();
    expect(visualizationPayloads({ chartData: spec, visualization: spec })).toHaveLength(1);
    expect(visualizationPayloads({ visualizations: [spec, fixture({ type: "table" })] })).toHaveLength(2);
  });
  it.each(["bar", "horizontalBar", "line", "area", "pie", "doughnut", "scatter"] as const)("renders %s from declared encodings", async (chartType) => {
    const spec = fixture({ chartType });
    if (chartType === "scatter") { spec.encoding!.x = { ...columns[0], type: "quantitative" }; spec.data = [{ categoria: 1, valor: 2 }, { categoria: 3, valor: 4 }]; }
    const { container } = render(<VisualizationRenderer specification={spec} />);
    await waitFor(() => expect(container.querySelector(".recharts-surface")).toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "Dados reais" })).toBeInTheDocument();
  });
  it("renders multiple metric series and preserves nulls", async () => {
    const spec = fixture({ chartType: "line", data: [{ categoria: "2025", valor: null, outra: 3 }, { categoria: "2026", valor: 4, outra: 6 }] });
    spec.encoding!.y = { ...columns[1], fields: ["valor", "outra"] };
    const { container } = render(<VisualizationRenderer specification={spec} />);
    await waitFor(() => expect(container.querySelectorAll(".recharts-line")).toHaveLength(2));
    expect(validateVisualization(spec).spec?.data[0].valor).toBeNull();
    expect(formatDataValue(null)).toBe("—");
  });
  it("supports explicitly named categorical series and numeric formats", async () => {
    const spec = fixture({ chartType: "bar", data: [{ categoria: "2025", valor: 2, operador: "A" }, { categoria: "2025", valor: 4, operador: "B" }, { categoria: "2026", valor: 3, operador: "A" }, { categoria: "2026", valor: 5, operador: "B" }] });
    spec.encoding!.color = { field: "operador", title: "Operador", type: "nominal" };
    const { container } = render(<VisualizationRenderer specification={spec} />);
    await waitFor(() => expect(container.querySelectorAll(".recharts-bar")).toHaveLength(2));
    expect(formatDataValue(0.25, { ...columns[1], format: "percent" })).toBe("25%");
    expect(formatDataValue("2026-11-09", { ...columns[0], type: "temporal" })).toBe("09/11/2026");
  });
  it("provides all 98 rows through pagination, sorting and searching", async () => {
    const data = Array.from({ length: 98 }, (_, i) => ({ categoria: `Município ${i + 1}`, valor: i + 1 }));
    render(<DynamicTable data={data} columns={columns} />);
    expect(screen.getByText("1–10 de 98 registros carregados")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Valor/ }));
    await userEvent.click(screen.getByRole("button", { name: /Valor/ }));
    expect(screen.getByRole("cell", { name: "Município 98" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Próxima página" }));
    expect(screen.getByRole("cell", { name: "Município 88" })).toBeInTheDocument();
    await userEvent.type(screen.getByRole("textbox", { name: "Pesquisar dados da tabela" }), "Município 98");
    expect(screen.getAllByRole("row")).toHaveLength(2);
    expect(screen.getByText("1–1 de 1 registros carregados encontrados")).toBeInTheDocument();
  });
  it("retains all 98 chart categories with scroll instead of a top ten limit", async () => {
    const spec = fixture({ chartType: "horizontalBar", data: Array.from({ length: 98 }, (_, i) => ({ categoria: `Cidade ${i}`, valor: i })) });
    render(<VisualizationRenderer specification={spec} />);
    const region = await screen.findByRole("region", { name: /98 registros/ });
    expect(region.firstElementChild).toHaveStyle({ height: "3000px" });
    await userEvent.type(screen.getByRole("textbox", { name: "Pesquisar categorias" }), "Cidade 97");
    expect(screen.getByRole("region", { name: /1 registros/ })).toBeInTheDocument();
  });
  it("exports all loaded rows with CSV escaping and formula protection", async () => {
    const spec = fixture({ type: "table", data: [{ categoria: '=HYPERLINK("bad")', valor: 2 }, { categoria: "A;B", valor: null }] });
    const csv = csvData(spec.data, spec.columns);
    expect(csv).toContain('"\'=HYPERLINK(""bad"")"');
    expect(csv).toContain('"A;B";""');
    const create = vi.fn(() => "blob:test");
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<VisualizationRenderer specification={spec} />);
    await userEvent.click(screen.getByRole("button", { name: "CSV" }));
    expect(create).toHaveBeenCalledWith(expect.any(Blob));
    click.mockRestore();
  });
  it.each([{}, { schemaVersion: "2.0" }, { chartType: "script" }, { encoding: undefined }, { encoding: { x: columns[0], y: { field: "missing", title: "Missing", type: "quantitative" } } }])("rejects invalid or missing fields without breaking the response", (override) => {
    const raw = Object.keys(override).length ? { ...fixture(), ...override } : {};
    render(<VisualizationRenderer specification={raw} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
  it("handles empty data and partial record counts honestly", () => {
    render(<VisualizationRenderer specification={fixture({ type: "table", data: [], metadata: { complete: false, totalRecords: 98 } })} />);
    expect(screen.getByRole("status")).toHaveTextContent("Nenhum dado");
    expect(screen.getByText(/0 registros carregados · 98/)).toHaveTextContent("Dados parciais");
  });
  it("preserves explanatory text and suppresses equivalent Markdown tables", async () => {
    render(<AgentResponse response={"Explicação.\n\n| Categoria | Valor |\n| --- | --- |\n| A | 12 |\n| B | 4 |\n\nNota final."} visualizations={[fixture()]} />);
    await screen.findByRole("button", { name: "Ver tabela" });
    expect(screen.getByText("Explicação.")).toBeInTheDocument();
    expect(screen.getByText("Nota final.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Ver tabela" }));
    expect(screen.getAllByRole("table")).toHaveLength(1);
    await userEvent.click(screen.getByRole("button", { name: "Restaurar visualização" }));
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
  it("supports expansion and closing without changing the data", async () => {
    render(<VisualizationRenderer specification={fixture({ type: "table" })} />);
    await userEvent.click(screen.getByRole("button", { name: "Expandir" }));
    expect(within(screen.getByRole("dialog")).getByRole("cell", { name: "A" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Fechar visualização" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "B" })).toBeInTheDocument();
  });
  it("loads backend pages only for the owning conversation and dataset", async () => {
    vi.mocked(getVisualizationPage).mockResolvedValueOnce({ data: [{ categoria: "C", valor: 7 }], totalElements: 2, hasNext: true, refreshed: true }).mockResolvedValueOnce({ data: [{ categoria: "D", valor: 8 }], totalElements: 2, hasNext: false, refreshed: true });
    render(<VisualizationRenderer specification={fixture({ type: "table", datasetId: "dataset-a", metadata: { complete: false, totalRecords: 98, dataEndpoint: "/api/agent/conversations/{conversationId}/datasets/dataset-a?page=0&size=20" } })} conversationId="session-a" />);
    await userEvent.click(screen.getByRole("button", { name: "Consultar páginas na fonte" }));
    expect(await screen.findByRole("cell", { name: "C" })).toBeInTheDocument();
    expect(getVisualizationPage).toHaveBeenCalledWith("session-a", "dataset-a", 0, expect.any(AbortSignal));
    await userEvent.click(screen.getByRole("button", { name: "Carregar próxima página da fonte" }));
    await screen.findByRole("cell", { name: "D" });
    expect(screen.queryByRole("button", { name: /Carregar próxima/ })).not.toBeInTheDocument();
  });
});
