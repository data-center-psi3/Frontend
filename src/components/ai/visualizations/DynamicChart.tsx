import { useId, useMemo, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, ScatterChart, Scatter, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts";
import type { DataRow, VisualizationSpec } from "../../../types/agentVisualization";
import { formatDataValue } from "../../../utils/agentVisualization";
import { chartPalette, primaryChartColor } from "../../charts/chartTheme";

const colors = [primaryChartColor, ...chartPalette.filter((color) => color !== primaryChartColor)];
export function DynamicChart({ spec }: { spec: VisualizationSpec }) {
  const [search, setSearch] = useState("");
  const [order, setOrder] = useState("source");
  const gradientId = `ai-chart-${useId().replace(/:/g, "")}`;
  const { x, y, color } = spec.encoding!;
  const metrics = y.fields ?? [y.field];
  const source = useMemo(() => {
    const rows = spec.data.filter((row) => String(row[x.field] ?? "").toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")));
    if (order !== "source") rows.sort((a, b) => {
      const left = a[y.field], right = b[y.field];
      if (left == null) return right == null ? 0 : 1;
      if (right == null) return -1;
      return (Number(left) - Number(right)) * (order === "desc" ? -1 : 1);
    });
    return rows;
  }, [spec.data, x.field, y.field, order, search]);
  const groups = color ? [...new Set(source.map((row) => row[color.field]))] : [];
  const series = groups.length ? groups.flatMap((group, groupIndex) => metrics.map((metric, metricIndex) => ({ key: `s${groupIndex}_${metricIndex}`, name: `${formatDataValue(group)}${metrics.length > 1 ? ` · ${metric}` : ""}`, field: metric, group }))) : metrics.map((metric, index) => ({ key: `s${index}`, name: spec.columns.find((c) => c.field === metric)?.title ?? metric, field: metric, group: undefined }));
  // Align explicit series by the declared dimension, without summing duplicate observations.
  const data: DataRow[] = [];
  for (const row of source) {
    const matches = series.filter((s) => !color || row[color.field] === s.group);
    const existing = color ? data.find((point) => point.dimension === row[x.field] && matches.every((s) => !Object.prototype.hasOwnProperty.call(point, s.key))) : undefined;
    if (existing) { for (const s of matches) existing[s.key] = row[s.field] ?? null; continue; }
    const point: DataRow = { dimension: row[x.field] ?? null };
    for (const s of matches) point[s.key] = row[s.field] ?? null;
    data.push(point);
  }
  const horizontal = spec.chartType === "horizontalBar";
  const circular = spec.chartType === "pie" || spec.chartType === "doughnut";
  const pieTotal = spec.data.reduce((total, row) => total + (typeof row[y.field] === "number" ? Number(row[y.field]) : 0), 0);
  const height = horizontal ? Math.max(260, source.length * 30 + 60) : 300;
  const width = !horizontal && !circular && spec.chartType !== "scatter" && source.length > 20 ? source.length * 34 : undefined;
  const gradients = <defs>
    {colors.map((shade, index) => <g key={shade}>
      <linearGradient id={`${gradientId}-bar-${index}`} x1="0" y1={horizontal ? "0" : "1"} x2={horizontal ? "1" : "0"} y2="0">
        <stop offset="0%" stopColor={shade} stopOpacity={0.55} /><stop offset="100%" stopColor={shade} stopOpacity={1} />
      </linearGradient>
      <linearGradient id={`${gradientId}-area-${index}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={shade} stopOpacity={0.24} /><stop offset="65%" stopColor={shade} stopOpacity={0.07} /><stop offset="100%" stopColor={shade} stopOpacity={0} />
      </linearGradient>
      <linearGradient id={`${gradientId}-slice-${index}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={chartPalette[index]} stopOpacity={1} /><stop offset="100%" stopColor={chartPalette[index]} stopOpacity={0.5} />
      </linearGradient>
    </g>)}
  </defs>;
  const tooltip = <Tooltip wrapperStyle={{ zIndex: "var(--z-chart-tooltip)" }}
    cursor={circular ? false : spec.chartType === "bar" || horizontal ? { fill: "hsl(var(--accent))", stroke: "#22c55e", strokeWidth: 0.45, radius: 5 } : { stroke: "hsl(var(--muted-foreground))", strokeWidth: 1, strokeDasharray: "3 5" }}
    content={({ active, payload, label }) => !active || !payload?.length ? null : <div className="analytics-tooltip">
      <span><i style={{ background: payload[0].color?.startsWith("url(") ? colors[0] : payload[0].color ?? colors[0] }} />{formatDataValue(circular ? payload[0].payload?.[x.field] ?? String(payload[0].name ?? "") : label == null ? String(payload[0].name ?? "") : typeof label === "number" ? label : String(label), x)}</span>
      {payload.map((item, index) => <strong key={index}>{formatDataValue(item.value == null ? null : typeof item.value === "number" ? item.value : String(item.value), y)}{circular && <small>{pieTotal > 0 && typeof item.value === "number" ? new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 2 }).format(item.value / pieTotal) : "—"} do total</small>}{payload.length > 1 && <small>{String(item.name ?? "")}</small>}</strong>)}
      <p>Valor conforme a fonte cadastrada</p>
    </div>} />;
  const legend = <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: "hsl(var(--muted-foreground))" }} />;
  const categorical = x.type !== "quantitative";
  const axes = <>
    <CartesianGrid vertical={horizontal} horizontal={!horizontal} strokeDasharray="2 6" />
    <XAxis dataKey={horizontal ? undefined : "dimension"} type={horizontal || !categorical ? "number" : "category"} allowDuplicatedCategory={!color}
      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false}
      tickFormatter={(v) => formatDataValue(v, horizontal ? y : x)} name={horizontal ? y.title : x.title} />
    <YAxis dataKey={horizontal ? "dimension" : undefined} type={horizontal ? "category" : "number"} width={horizontal ? 100 : 64}
      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false}
      tickFormatter={(v) => formatDataValue(v, horizontal ? x : y)} name={horizontal ? x.title : y.title} />
    {tooltip}{spec.legend?.visible && legend}
  </>;
  const shared = { data, margin: { top: 12, right: 18, left: 0, bottom: 12 } };
  let chart;
  if (circular) chart = <PieChart>{gradients}{tooltip}<Pie data={source} dataKey={y.field} nameKey={x.field} innerRadius={spec.chartType === "doughnut" ? "75%" : 0} outerRadius="90%" paddingAngle={source.length > 12 ? 0 : 2} cornerRadius={source.length > 12 ? 0 : 4} label={false} labelLine={false} stroke="none" startAngle={90} endAngle={-270} isAnimationActive={false}>{source.map((_, i) => <Cell key={i} fill={`url(#${gradientId}-slice-${i % colors.length})`} />)}</Pie></PieChart>;
  else if (spec.chartType === "scatter") chart = <ScatterChart margin={shared.margin}>
    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 6" />
    <XAxis type="number" dataKey={x.field} name={x.title} axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => formatDataValue(v, x)} />
    <YAxis type="number" dataKey={y.field} name={y.title} axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => formatDataValue(v, y)} />
    {tooltip}{spec.legend?.visible && legend}
    {series.map((s, i) => <Scatter key={s.key} name={s.name} fill={colors[i % colors.length]} isAnimationActive={false} data={source.filter((r) => r[x.field] != null && r[s.field] != null && (!color || r[color.field] === s.group)).map((r) => ({ ...r, [y.field]: r[s.field] }))} />)}
  </ScatterChart>;
  else if (spec.chartType === "line") chart = <LineChart {...shared}>{axes}{series.map((s, i) => <Line key={s.key} type="monotone" name={s.name} dataKey={s.key} stroke={colors[i % colors.length]} strokeWidth={2.5} strokeLinecap="round" connectNulls={false} dot={source.length < 40 ? { r: 2.5, fill: colors[i % colors.length], strokeWidth: 0 } : false} activeDot={{ r: 5, fill: "hsl(var(--card))", stroke: colors[i % colors.length], strokeWidth: 2.5 }} isAnimationActive={false} />)}</LineChart>;
  else if (spec.chartType === "area") chart = <AreaChart {...shared}>{gradients}{axes}{series.map((s, i) => <Area key={s.key} type="monotone" name={s.name} dataKey={s.key} stroke={colors[i % colors.length]} strokeWidth={2.5} fill={`url(#${gradientId}-area-${i % colors.length})`} fillOpacity={1} connectNulls={false} activeDot={{ r: 5, fill: "hsl(var(--card))", stroke: colors[i % colors.length], strokeWidth: 2.5 }} isAnimationActive={false} />)}</AreaChart>;
  else chart = <BarChart {...shared} layout={horizontal ? "vertical" : "horizontal"}>{gradients}{axes}{series.map((s, i) => <Bar key={s.key} name={s.name} dataKey={s.key} fill={`url(#${gradientId}-bar-${i % colors.length})`} radius={horizontal ? [0, 5, 5, 0] : [7, 7, 0, 0]} maxBarSize={horizontal ? 15 : 36} background={horizontal ? { fill: "hsl(var(--muted))", radius: 5 } : undefined} activeBar={false} isAnimationActive={false} />)}</BarChart>;
  return <div className="ai-chart">
    <div className="ai-chart-filters">
      <input aria-label="Pesquisar categorias" placeholder="Pesquisar categorias…" value={search} onChange={(e) => setSearch(e.target.value)} />
      <select aria-label="Ordenar gráfico" value={order} onChange={(e) => setOrder(e.target.value)}><option value="source">Ordem da fonte</option><option value="desc">Maior valor</option><option value="asc">Menor valor</option></select>
    </div>
    <p className="ai-axis-caption">{x.title} · {y.title}{y.unit ? ` (${y.unit})` : ""}</p>
    <div className="ai-chart-scroll" tabIndex={0} role="region" aria-label={`${spec.title}: ${source.length} registros. Consulte a tabela para valores acessíveis.`}>
      <div className="chart-wrap" style={{ height, minWidth: width, width: width ? undefined : "100%" }}>
        <ResponsiveContainer width="100%" height="100%">{chart}</ResponsiveContainer>
      </div>
    </div>
    {circular && <ul className="ai-pie-legend" aria-label="Categorias do gráfico de pizza" tabIndex={0}>
      {source.map((row, index) => <li key={index}>
        <i aria-hidden="true" style={{ background: chartPalette[index % chartPalette.length] }} />
        <span>{formatDataValue(row[x.field], x)}</span>
        <strong>{formatDataValue(row[y.field], y)}</strong>
      </li>)}
    </ul>}
    {circular && <p className="ai-axis-caption">Percentuais sobre {spec.metadata.complete ? "o total retornado pela fonte" : "os registros carregados"}; a pesquisa não altera esse total.</p>}
    {!source.length && <p role="status">Nenhuma categoria encontrada.</p>}
  </div>;
}
