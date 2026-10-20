import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ExternalLink, Search, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { ColumnValueFilter, type ColumnTerm } from "./ColumnValueFilter";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { EmptyState } from "./common";
import { errorMessage, loadImportedCenters } from "../services/api";
import { importColumns } from "../types/imports";
import type { ImportedDataCenter } from "../types/imports";
import type { Connection } from "../types/api";
import { normalize, safeUrl, displayValue } from "../utils/data";
function HighlightedValue({
  value,
  terms,
}: {
  value: string;
  terms: string[];
}) {
  const offsets: { start: number; end: number }[] = [];
  let normalized = "";
  let offset = 0;
  for (const char of value) {
    const token = normalize(char);
    for (let i = 0; i < token.length; i++)
      offsets.push({ start: offset, end: offset + char.length });
    if (!token && offsets.length)
      offsets[offsets.length - 1].end = offset + char.length;
    normalized += token;
    offset += char.length;
  }
  const ranges: { start: number; end: number }[] = [];
  for (const term of terms) {
    const needle = normalize(term.trim());
    if (!needle) continue;
    for (
      let index = normalized.indexOf(needle);
      index !== -1;
      index = normalized.indexOf(needle, index + 1)
    ) {
      ranges.push({
        start: offsets[index].start,
        end: offsets[index + needle.length - 1].end,
      });
    }
  }
  ranges.sort((a, b) => a.start - b.start);
  const merged: typeof ranges = [];
  for (const range of ranges) {
    const previous = merged.at(-1);
    if (previous && range.start <= previous.end)
      previous.end = Math.max(previous.end, range.end);
    else merged.push({ ...range });
  }
  let end = 0;
  return (
    <span className={`raw-cell-value ${merged.length ? "has-match" : ""}`}>
      {merged.map((range) => {
        const before = value.slice(end, range.start);
        end = range.end;
        return (
          <span key={range.start}>
            {before}
            <mark className="raw-search-highlight">
              {value.slice(range.start, range.end)}
            </mark>
          </span>
        );
      })}
      {value.slice(end)}
    </span>
  );
}
export function DataCentersTable({
  connection,
}: {
  connection: Connection | null;
}) {
  const [filters, setFilters] = useState<
    Partial<Record<keyof ImportedDataCenter, ColumnTerm[]>>
  >({});
  const [drafts, setDrafts] = useState<
    Partial<Record<keyof ImportedDataCenter, string>>
  >({});
  const [openColumn, setOpenColumn] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: ["imported-centers", connection?.baseUrl],
    queryFn: ({ signal }) => loadImportedCenters(connection!, signal),
    enabled: !!connection,
  });
  if (query.isPending && connection)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Carregando dados da tabela...
      </p>
    );
  if (query.isError)
    return (
      <div role="alert">
        <p className="text-sm text-muted-foreground">
          {errorMessage(query.error)}
        </p>
        <Button
          variant="outline"
          className="mt-3"
          onClick={() => query.refetch()}
        >
          Tentar novamente
        </Button>
      </div>
    );
  const columnTerms = (key: keyof ImportedDataCenter): ColumnTerm[] => [
    ...(filters[key] ?? []),
    ...(drafts[key]?.trim()
      ? [{ value: drafts[key]!.trim(), exact: false }]
      : []),
  ];
  const activeFilters = Object.values(importColumns).filter(
    (key) => columnTerms(key).length > 0,
  );
  const columnOptions = (key: keyof ImportedDataCenter) =>
    [...new Set((query.data ?? []).map((row) => displayValue(row[key])))].sort(
      (a, b) => a.localeCompare(b, "pt-BR", { numeric: true }),
    );
  const rows = (query.data ?? []).filter(
    (row) =>
      (!search.trim() ||
        Object.values(row).some((value) =>
          normalize(displayValue(value)).includes(normalize(search.trim())),
        )) &&
      activeFilters.every((key) =>
        columnTerms(key).some((term) => {
          const value = normalize(displayValue(row[key]));
          const needle = normalize(term.value);
          return term.exact ? value === needle : value.includes(needle);
        }),
      ),
  );
  return (
    <>
      <div className="raw-table-toolbar">
        <div className="filter-search">
          <Search size={15} />
          <Input
            aria-label="Pesquisar dados da tabela"
            placeholder="Buscar em todas as colunas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span>Clique no cabeçalho de uma coluna para filtrar.</span>
        {(activeFilters.length > 0 || search.trim()) && (
          <Button
            variant="ghost"
            className="raw-clear-filters"
            onClick={() => {
              setFilters({});
              setDrafts({});
              setSearch("");
            }}
          >
            <X size={12} /> Limpar filtros (
            {activeFilters.length + (search.trim() ? 1 : 0)})
          </Button>
        )}
        <span role="status" className="raw-table-count">
          {rows.length} de {query.data?.length ?? 0} registros
        </span>
      </div>
      <p className="raw-table-note">
        Os filtros desta tabela são independentes dos filtros do mapa. A coluna
        id contém o identificador original do levantamento. Números e datas são
        apresentados como registrados na fonte.
      </p>
      {!query.data?.length ? (
        <EmptyState
          title="Nenhum registro encontrado"
          description="A API de importações ainda não retornou linhas brutas para esta tabela."
        />
      ) : (
        <div
          className="table-container data-centers-table raw-data-table"
          role="region"
          aria-label="Tabela de dados completos dos data centers"
          tabIndex={0}
        >
          <Table>
            <caption className="sr-only">
              Dados originais dos data centers, com as 28 colunas do
              levantamento.
            </caption>
            <TableHeader>
              <TableRow>
                {Object.entries(importColumns).map(([label, key]) => (
                  <TableHead scope="col" key={label}>
                    <Button
                      variant="ghost"
                      className={`raw-column-trigger ${columnTerms(key).length ? "has-filter" : ""}`}
                      aria-label={`Filtrar coluna ${label}`}
                      aria-expanded={openColumn === key}
                      aria-controls={`column-filter-${key}`}
                      onClick={() =>
                        setOpenColumn(openColumn === key ? null : key)
                      }
                    >
                      {label}
                      {columnTerms(key).length > 0 && (
                        <span className="column-filter-count">
                          {columnTerms(key).length}
                        </span>
                      )}
                      <ChevronDown size={12} />
                    </Button>
                    <div
                      id={`column-filter-${key}`}
                      hidden={openColumn !== key}
                      className="raw-column-filter"
                    >
                      {openColumn === key && (
                        <ColumnValueFilter
                          label={label}
                          terms={filters[key] ?? []}
                          draft={drafts[key] ?? ""}
                          options={columnOptions(key)}
                          onDraft={(value) =>
                            setDrafts((previous) => ({
                              ...previous,
                              [key]: value,
                            }))
                          }
                          onTerms={(terms) =>
                            setFilters((previous) => ({
                              ...previous,
                              [key]: terms,
                            }))
                          }
                          onClose={() => setOpenColumn(null)}
                        />
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {!rows.length && (
                <TableRow>
                  <TableCell colSpan={Object.keys(importColumns).length}>
                    Nenhum registro corresponde aos filtros. Ajuste ou limpe os
                    filtros nas colunas.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((row, index) => (
                <TableRow key={index}>
                  {Object.entries(importColumns).map(([label, key]) => {
                    const value = row[key];
                    const url = key === "fonteUrl" ? safeUrl(value) : undefined;
                    return (
                      <TableCell
                        key={label}
                        title={displayValue(value)}
                        className={
                          [
                            "endereco",
                            "fonte_url",
                            "certificacoes",
                            "robustez_evidencia",
                            "resfriamento",
                            "fonte_energia",
                          ].includes(label)
                            ? "center-description-cell"
                            : undefined
                        }
                      >
                        {url ? (
                          <a
                            className="source-link raw-source-link"
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <HighlightedValue
                              value={displayValue(value)}
                              terms={[
                                search,
                                ...columnTerms(key).map((term) => term.value),
                              ]}
                            />
                            <ExternalLink size={12} />
                          </a>
                        ) : (
                          <HighlightedValue
                            value={displayValue(value)}
                            terms={[
                              search,
                              ...columnTerms(key).map((term) => term.value),
                            ]}
                          />
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
