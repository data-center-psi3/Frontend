import { Fragment, type ReactNode } from "react";
import { formatAgentResponse } from "../utils/formatAgentResponse";
import { Bars } from "./charts/IndicatorChart";
import { VisualizationRenderer } from "./ai/visualizations/VisualizationRenderer";
import { validateVisualization } from "../utils/agentVisualization";

// Render text as React nodes; API content is never interpreted as HTML.
function inline(text: string): ReactNode[] {
  return text.split(/(`[^`\n]+`|\[[^\]\n]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s<>]+|\*\*\*[^\n]+?\*\*\*|___[^\n]+?___|\*\*[^\n]+?\*\*|__[^\n]+?__|(?<!\*)\*(?!\*)[^*\n]+\*(?!\*)|(?<![\w_])_(?!_)[^_\n]+_(?![\w_])|~~[^\n]+?~~)/g).map((part, index) => {
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (link) return <a key={index} href={link[2]} target="_blank" rel="noopener noreferrer">{link[1]}</a>;
    if (/^https?:\/\//.test(part)) {
      const url = part.replace(/[.,;!?]+$/, "");
      return <Fragment key={index}><a href={url} target="_blank" rel="noopener noreferrer">{url}</a>{part.slice(url.length)}</Fragment>;
    }
    if ((part.startsWith("***") && part.endsWith("***")) || (part.startsWith("___") && part.endsWith("___"))) return <strong key={index}><em>{inline(part.slice(3, -3))}</em></strong>;
    if ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("__") && part.endsWith("__"))) return <strong key={index}>{inline(part.slice(2, -2))}</strong>;
    if ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_"))) return <em key={index}>{inline(part.slice(1, -1))}</em>;
    if (part.startsWith("~~") && part.endsWith("~~")) return <del key={index}>{inline(part.slice(2, -2))}</del>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>;
    return part;
  });
}

export function AgentResponse({ response, visualizations = [], conversationId }: { response: string; visualizations?: unknown[]; conversationId?: string }) {
  const structuredRows = visualizations.flatMap((raw) => { const result = validateVisualization(raw); return (result.spec ?? result.fallback)?.data ?? []; });
  const blocks = formatAgentResponse(response).filter((block) => {
    // Suppress only an equivalent textual dataset, preserving unrelated tables and prose.
    if (block.type === "table") return !structuredRows.length || !block.rows.every((row) => structuredRows.some((record) => row.every((cell) => Object.values(record).some((v) => String(v ?? "").trim() === cell.replace(/\*\*/g, "").trim()))));
    if (block.type === "chart") return !structuredRows.length || !block.data.every((point) => structuredRows.some((record) => Object.values(record).includes(point.name) && Object.values(record).includes(point.value)));
    return true;
  });
  return (
    <div className="agent-response">
      {blocks.map((block, index) => {
        if (block.type === "chart") return (
          <section key={index} className="agent-chart" aria-label="Gráfico da resposta">
            <h3>Distribuição informada</h3>
            <Bars data={block.data} horizontal color="#059669" />
          </section>
        );
        if (block.type === "table") return (
          <div key={index} className="agent-table-scroll" role="region" aria-label="Tabela da resposta" tabIndex={0}>
            <table className="agent-table">
              <thead><tr>{block.headers.map((header, column) => (
                <th key={column} scope="col" style={{ textAlign: block.alignments[column] }}>{inline(header)}</th>
              ))}</tr></thead>
              <tbody>{block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>{row.map((cell, column) => (
                  <td key={column} style={{ textAlign: block.alignments[column] }}>{inline(cell)}</td>
                ))}</tr>
              ))}</tbody>
            </table>
          </div>
        );
        if (block.type === "record") return (
          <section key={index} className="agent-response-record">
            <h3>{inline(block.title)}</h3>
            <details>
              <summary>Ver dados cadastrados</summary>
              <dl>{block.fields.map((field, fieldIndex) => (
                <div key={fieldIndex}><dt>{field.label}</dt><dd>{inline(field.value)}</dd></div>
              ))}</dl>
            </details>
          </section>
        );
        if (block.type === "list") {
          const List = block.ordered ? "ol" : "ul";
          return <List key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{inline(item)}</li>)}</List>;
        }
        if (block.type === "heading") return <h3 key={index}>{inline(block.text)}</h3>;
        return <p key={index}>{inline(block.text)}</p>;
      })}
      {visualizations.map((specification, index) => <VisualizationRenderer key={index} specification={specification} conversationId={conversationId} />)}
    </div>
  );
}
