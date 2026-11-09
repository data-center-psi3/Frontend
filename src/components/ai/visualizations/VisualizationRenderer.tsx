import { Component, Suspense, lazy, useEffect, useRef, useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Download, Expand, RotateCcw, Table2, X, ChartNoAxesCombined } from "lucide-react";
import { validateVisualization, csvData, downloadFile } from "../../../utils/agentVisualization";
import { getVisualizationPage } from "../../../services/agent";
import { DynamicTable } from "./DynamicTable";
import type { VisualizationSpec } from "../../../types/agentVisualization";
import "./visualizations.css";

const DynamicChart = lazy(() => import("./DynamicChart").then((module) => ({ default: module.DynamicChart })));
class VisualizationBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
export function VisualizationRenderer({ specification, conversationId, loading = false }: { specification: unknown; conversationId?: string; loading?: boolean }) {
  const result = validateVisualization(specification);
  const initial = result.spec ?? result.fallback;
  if (loading) return <p role="status">Carregando visualização…</p>;
  if (!initial) return <p role="alert" className="ai-viz-error">{result.error}</p>;
  return <VisualizationCard key={JSON.stringify(specification)} initial={initial} error={result.error} conversationId={conversationId} />;
}
function VisualizationCard({ initial, error, conversationId }: { initial: VisualizationSpec; error?: string; conversationId?: string }) {
  const [spec, setSpec] = useState(initial);
  const [table, setTable] = useState(initial.type === "table");
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState("");
  const [refreshed, setRefreshed] = useState(false);
  const [revision, setRevision] = useState(0);
  const content = useRef<HTMLDivElement>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  // Component instances are scoped to their message and unmounted on session changes.
  const canLoad = !spec.metadata.complete && !!conversationId && !!spec.datasetId && !!spec.metadata.dataEndpoint;
  async function loadMore() {
    if (loading || !conversationId || !spec.datasetId) return;
    const controller = new AbortController(); request.current = controller;
    setLoading(true); setPageError("");
    try {
      const response = await getVisualizationPage(conversationId, spec.datasetId, page, controller.signal);
      if (controller.signal.aborted) return;
      setSpec((current) => ({ ...current, data: page === 0 ? response.data : [...current.data, ...response.data], metadata: { ...current.metadata, totalRecords: response.totalElements >= 0 ? response.totalElements : undefined, complete: !response.hasNext } }));
      setPage(page + 1); setRefreshed((current) => current || response.refreshed);
    } catch { if (!controller.signal.aborted) setPageError("Não foi possível carregar a próxima página. Tente novamente."); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }
  const body = <>
    <div className="ai-viz-heading"><div><h3>{spec.title}</h3>{spec.description && <p>{spec.description}</p>}</div></div>
    <div className="ai-viz-toolbar" role="toolbar" aria-label="Ações da visualização">
      {initial.type === "chart" && <button onClick={() => setTable(!table)} aria-pressed={table}>{table ? <ChartNoAxesCombined size={14} /> : <Table2 size={14} />}{table ? "Gráfico" : "Ver tabela"}</button>}
      <button onClick={() => downloadFile(csvData(spec.data, spec.columns), "text/csv;charset=utf-8", "dataterra-dados.csv")}><Download size={14} />CSV</button>
      {!table && <button onClick={() => { const svg = content.current?.querySelector(".recharts-surface"); if (svg) downloadFile(new XMLSerializer().serializeToString(svg), "image/svg+xml", "dataterra-grafico.svg"); }}>SVG</button>}
      {!expanded && <button onClick={() => setExpanded(true)}><Expand size={14} />Expandir</button>}
      <button aria-label="Restaurar visualização" onClick={() => { setTable(initial.type === "table"); setRevision((n) => n + 1); }}><RotateCcw size={14} /></button>
    </div>
    {error && <p className="ai-viz-error" role="alert">{error}</p>}
    {spec.metadata.message && <p className="ai-viz-notice">{spec.metadata.message}</p>}
    {spec.metadata.warning && <p className="ai-viz-notice">{spec.metadata.warning}</p>}
    <div ref={content} key={revision}>
      {!spec.data.length ? <p role="status">Nenhum dado disponível nesta resposta.</p> : table ? <DynamicTable data={spec.data} columns={spec.columns} /> :
        <VisualizationBoundary fallback={<><p role="alert">Não foi possível desenhar o gráfico. Os dados estão disponíveis abaixo.</p><DynamicTable data={spec.data} columns={spec.columns} /></>}>
          <Suspense fallback={<p role="status">Carregando gráfico…</p>}><DynamicChart spec={spec} /></Suspense>
        </VisualizationBoundary>}
    </div>
    <div className="ai-viz-footnote">
      <span>{spec.data.length} registros carregados{spec.metadata.totalRecords != null ? ` · ${spec.metadata.totalRecords} informados pela fonte` : " · total não informado"}{!spec.metadata.complete ? " · Dados parciais" : ""}</span>
      {spec.metadata.source && <span>{spec.metadata.source}</span>}
      {spec.metadata.percentageScope === "returned_records_only" && <span>Percentuais calculados somente sobre os registros retornados.</span>}
      {refreshed && <span>Páginas consultadas novamente na fonte; os valores podem ter sido atualizados.</span>}
    </div>
    {canLoad && <button className="ai-load-more" disabled={loading} onClick={() => void loadMore()}>{loading ? "Carregando dados…" : page === 0 ? "Consultar páginas na fonte" : "Carregar próxima página da fonte"}</button>}
    {pageError && <p role="alert">{pageError}</p>}
  </>;
  return <section className="ai-visualization" aria-label={spec.title}>
    {!expanded && body}
    <Dialog.Root open={expanded} onOpenChange={setExpanded}>
      <Dialog.Portal><Dialog.Overlay className="ai-viz-overlay" />
        <Dialog.Content className="ai-viz-dialog" onEscapeKeyDown={(event) => event.stopPropagation()}>
          <Dialog.Title className="sr-only">{spec.title}</Dialog.Title>
          <Dialog.Description className="sr-only">Visualização expandida. Alterne para tabela para consultar todos os valores.</Dialog.Description>
          <Dialog.Close className="ai-viz-close" aria-label="Fechar visualização"><X size={18} /></Dialog.Close>
          {expanded && body}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </section>;
}
