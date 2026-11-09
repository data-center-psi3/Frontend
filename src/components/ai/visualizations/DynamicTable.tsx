import { useMemo, useState } from "react";
import type { DataRow, Field } from "../../../types/agentVisualization";
import { formatDataValue } from "../../../utils/agentVisualization";

export function DynamicTable({ data, columns }: { data: DataRow[]; columns: Field[] }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<{ field: string; descending: boolean }>();
  const rows = useMemo(() => {
    const filtered = data.filter((row) => columns.some((column) => formatDataValue(row[column.field], column).toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))));
    if (sort) filtered.sort((a, b) => {
      const left = a[sort.field], right = b[sort.field];
      if (left == null) return right == null ? 0 : 1;
      if (right == null) return -1;
      const result = typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right), "pt-BR", { numeric: true });
      return sort.descending ? -result : result;
    });
    return filtered;
  }, [data, columns, search, sort]);
  const last = Math.max(0, Math.ceil(rows.length / 10) - 1), current = Math.min(page, last);
  return <div className="ai-table">
    <input aria-label="Pesquisar dados da tabela" placeholder="Pesquisar nos dados carregados…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
    <div className="agent-table-scroll" tabIndex={0} role="region" aria-label="Dados da visualização">
      <table className="agent-table">
        <thead><tr>{columns.map((column) => <th key={column.field} scope="col" aria-sort={sort?.field === column.field ? (sort.descending ? "descending" : "ascending") : "none"}>
          <button onClick={() => { setSort({ field: column.field, descending: sort?.field === column.field && !sort.descending }); setPage(0); }}>{column.title} <span aria-hidden="true">{sort?.field === column.field ? sort.descending ? "↓" : "↑" : "↕"}</span></button>
        </th>)}</tr></thead>
        <tbody>{rows.slice(current * 10, current * 10 + 10).map((row, index) => <tr key={index}>{columns.map((column) => <td key={column.field}>{formatDataValue(row[column.field], column)}</td>)}</tr>)}</tbody>
      </table>
    </div>
    {!rows.length && <p role="status">Nenhum registro encontrado.</p>}
    <div className="ai-pagination">
      <span>{rows.length ? `${current * 10 + 1}–${Math.min(current * 10 + 10, rows.length)}` : "0"} de {rows.length} registros carregados{search ? " encontrados" : ""}</span>
      <button disabled={current === 0} onClick={() => setPage(current - 1)} aria-label="Página anterior">Anterior</button>
      <button disabled={current >= last} onClick={() => setPage(current + 1)} aria-label="Próxima página">Próxima</button>
    </div>
  </div>;
}
