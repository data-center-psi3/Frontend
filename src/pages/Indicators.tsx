import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Panel, EmptyState, SourceReference } from "../components/common";
import { Tabs } from "../components/ui/tabs";
import { FilterSelect } from "../components/ui/filter-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Bars, Trend } from "../components/charts/IndicatorChart";
import {
  categories,
  categoryOf,
  number,
  comparableGroups,
  displayValue,
} from "../utils/data";
import type { ViewProps } from "./Dashboard";
import { indicatorColor } from "../constants/design";
export function IndicatorTable({ data, centers, indicators }: ViewProps) {
  return indicators.length ? (
    <div className="table-container">
      <Table>
        <TableHeader>
          <TableRow>
            {[
              "Instalação",
              "Indicador",
              "Valor",
              "Período",
              "Fonte / observações",
            ].map((t) => (
              <TableHead key={t}>{t}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {indicators.map((i) => (
            <TableRow key={i.id}>
              <TableCell>
                {centers.find((c) => c.id === i.dataCenterId)?.nome ??
                  `Instalação ${i.dataCenterId}`}
              </TableCell>
              <TableCell>{displayValue(i.tipo)}</TableCell>
              <TableCell className="whitespace-nowrap">
                {number(i.valor)}{" "}
                {i.valor != null ? displayValue(i.unidade) : ""}
              </TableCell>
              <TableCell>{displayValue(i.periodo)}</TableCell>
              <TableCell>
                <SourceReference
                  source={data.sources.find((s) => s.id === i.fonteId)}
                />
                {i.observacoes && (
                  <p className="table-note">{displayValue(i.observacoes)}</p>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  ) : (
    <EmptyState />
  );
}
export function Indicators(props: ViewProps) {
  const [params] = useSearchParams();
  const [category, setCategory] = useState(params.get("category") ?? "todos");
  useEffect(() => {
    setCategory(params.get("category") ?? "todos");
  }, [params]);
  const [type, setType] = useState("");
  const [centerId, setCenterId] = useState("");
  const [unit, setUnit] = useState("");
  const records = props.indicators.filter(
    (i) =>
      (category === "todos" || categoryOf(i.tipo) === category) &&
      (!type || i.tipo === type),
  );
  const types = [
    ...new Set(
      props.indicators
        .filter((i) => category === "todos" || categoryOf(i.tipo) === category)
        .map((i) => i.tipo),
    ),
  ];
  const chartGroups = comparableGroups(records);
  const [groupIndex, setGroupIndex] = useState("");
  const group = chartGroups[Number(groupIndex) || 0] ?? [];
  const availableCenters = props.centers.filter((c) =>
    records.some((i) => i.dataCenterId === c.id),
  );
  const selectedCenter = availableCenters.some((c) => String(c.id) === centerId)
    ? centerId
    : String(availableCenters[0]?.id ?? "");
  const trendRecords = records.filter(
    (i) =>
      String(i.dataCenterId) === selectedCenter &&
      i.valor != null &&
      i.unidade != null &&
      i.periodo &&
      /^\d{4}$/.test(i.periodo),
  );
  const trendTypes = [
    ...new Set(trendRecords.map((i) => JSON.stringify([i.tipo, i.unidade]))),
  ];
  const selectedTrend = trendTypes.includes(unit)
    ? unit
    : (trendTypes[0] ?? "");
  const trend = useMemo(() => {
    const values = trendRecords
      .filter((i) => JSON.stringify([i.tipo, i.unidade]) === selectedTrend)
      .sort((a, b) => a.periodo!.localeCompare(b.periodo!));
    const unique = new Set(values.map((i) => i.periodo));
    return unique.size === values.length
      ? values.map((i) => ({ name: i.periodo!, value: i.valor! }))
      : [];
  }, [trendRecords, selectedTrend]);
  return (
    <>
      <Tabs
        value={category}
        onChange={(v) => {
          setCategory(v);
          setType("");
          setGroupIndex("");
        }}
        items={[
          { value: "todos", label: "Todos os indicadores" },
          ...categories.map((c) => ({ value: c.key, label: c.label })),
          { value: "outros", label: "Outros" },
        ]}
      />
      <div className="educational-note">
        {categories.find((c) => c.key === category)?.description ??
          "Explore medidas ambientais e consulte a origem de cada registro. PUE e WUE são índices de eficiência, não totais de consumo."}
      </div>
      <div className="inline-filters">
        <FilterSelect
          label="Tipo de indicador"
          value={type}
          onChange={(v) => {
            setType(v);
            setGroupIndex("");
          }}
          options={types.map((value) => ({ value, label: value }))}
        />
      </div>
      <div className="two-columns">
        <Panel
          title="Comparação por instalação"
          subtitle="Uma medida, uma unidade e um período por gráfico"
        >
          <FilterSelect
            label="Grupo comparável"
            value={group.length ? String(chartGroups.indexOf(group)) : ""}
            onChange={setGroupIndex}
            options={chartGroups.map((g, i) => ({
              value: String(i),
              label: `${g[0].tipo} · ${g[0].unidade} · ${g[0].periodo}`,
            }))}
          />
          <Bars
            data={group.map((i) => ({
              name:
                props.centers.find((c) => c.id === i.dataCenterId)?.nome ??
                String(i.dataCenterId),
              value: i.valor!,
            }))}
            unit={group[0]?.unidade ?? ""}
            color={indicatorColor(group[0]?.tipo ?? "")}
          />
          <div className="chart-sources">
            <span>Fontes:</span>
            {props.data.sources
              .filter((s) => group.some((i) => i.fonteId === s.id))
              .map((s) => (
                <SourceReference key={s.id} source={s} />
              ))}
            {!group.some((i) => i.fonteId != null) && (
              <span>Não informado</span>
            )}
          </div>
        </Panel>
        <Panel
          title="Evolução histórica"
          subtitle="Anos disponíveis da mesma instalação"
        >
          <div className="chart-controls">
            <FilterSelect
              label="Instalação"
              value={selectedCenter}
              onChange={setCenterId}
              options={availableCenters.map((c) => ({
                value: String(c.id),
                label: c.nome,
              }))}
            />
            <FilterSelect
              label="Medida / unidade"
              value={selectedTrend}
              onChange={setUnit}
              options={trendTypes.map((value) => ({
                value,
                label: JSON.parse(value).join(" · "),
              }))}
            />
          </div>
          <Trend
            color={indicatorColor(
              trendRecords.find(
                (i) => JSON.stringify([i.tipo, i.unidade]) === selectedTrend,
              )?.tipo ?? "",
            )}
            data={trend}
            unit={
              trendRecords.find(
                (i) => JSON.stringify([i.tipo, i.unidade]) === selectedTrend,
              )?.unidade ?? ""
            }
          />
          <p className="chart-explanation">
            Períodos livres ou duplicados não formam uma série anual confiável.
            Confira os registros abaixo.
          </p>
        </Panel>
      </div>
      <Panel
        title="Registros e evidências"
        subtitle={`${records.length} indicadores na seleção`}
      >
        <IndicatorTable {...props} indicators={records} />
      </Panel>
    </>
  );
}
