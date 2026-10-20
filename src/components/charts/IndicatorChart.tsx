import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ComposedChart,
  Area,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  useId,
  useMemo,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { EmptyState } from "../common";
import { number, displayValue, isMissing } from "../../utils/data";
const colors = [
  "#d97706",
  "#2563eb",
  "#7c3aed",
  "#ea580c",
  "#059669",
  "#64748b",
];
const motionQuery = "(prefers-reduced-motion: reduce)";
const subscribeMotion = (listener: () => void) => {
  if (!window.matchMedia) return () => {};
  const media = window.matchMedia(motionQuery);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
};
const prefersReducedMotion = () =>
  window.matchMedia?.(motionQuery).matches ?? true;
function ChartTooltip({
  active,
  payload,
  label,
  unit = "",
  color = "var(--resources)",
}: {
  active?: boolean;
  payload?: {
    value?: number | string;
    payload?: { name?: string; color?: string };
  }[];
  label?: unknown;
  unit?: string;
  color?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="analytics-tooltip">
      <span>
        <i style={{ background: payload[0].payload?.color ?? color }} />
        {displayValue(label ?? payload[0].payload?.name)}
      </span>
      <strong>
        {number(isMissing(payload[0].value) ? null : Number(payload[0].value))}
        <small>{unit ? displayValue(unit) : ""}</small>
      </strong>
      <p>Valor conforme a fonte cadastrada</p>
    </div>
  );
}
export function Bars({
  data,
  unit = "",
  color = "#059669",
  horizontal = false,
  allowDecimals = false,
  onSelect,
  animate = false,
  selectionLabel = (name) => `Abrir cidades de ${name}`,
}: {
  data: { name: string; value: number }[];
  unit?: string;
  color?: string;
  horizontal?: boolean;
  allowDecimals?: boolean;
  onSelect?: (name: string) => void;
  animate?: boolean;
  selectionLabel?: (name: string) => string;
}) {
  const gradientId = `bar-${useId().replace(/:/g, "")}`;
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    prefersReducedMotion,
    () => true,
  );
  if (!data.length)
    return (
      <EmptyState
        compact
        title="Sem valores comparáveis"
        description="São necessários valores numéricos com a mesma unidade e o mesmo período."
      />
    );
  return (
    <div
      className="chart-wrap"
      style={
        horizontal
          ? { height: Math.max(230, data.length * 30 + 30) }
          : undefined
      }
      role={onSelect ? "group" : "img"}
      aria-label={`Gráfico em barras (${unit}): ${data.map((d) => `${displayValue(d.name)}: ${number(d.value)}`).join("; ")}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout={horizontal ? "vertical" : "horizontal"}
          data={data.map((row) => ({ ...row, name: displayValue(row.name) }))}
          margin={{ top: 16, left: 0, right: 15, bottom: 12 }}
        >
          <defs>
            <linearGradient
              id={gradientId}
              x1="0"
              y1={horizontal ? "0" : "1"}
              x2={horizontal ? "1" : "0"}
              y2="0"
            >
              <stop offset="0%" stopColor={color} stopOpacity={0.55} />
              <stop offset="100%" stopColor={color} stopOpacity={1} />
            </linearGradient>
            <linearGradient
              id={`${gradientId}-cursor`}
              x1="0"
              y1="0"
              x2="1"
              y2="0"
              spreadMethod="reflect"
            >
              <stop offset="0%" stopColor="#bbf7d0" />
              <stop offset="50%" stopColor="#22c55e" />
              <stop offset="100%" stopColor="#86efac" />
              {!reducedMotion && (
                <animateTransform
                  attributeName="gradientTransform"
                  type="translate"
                  from="-1 0"
                  to="1 0"
                  dur="4s"
                  repeatCount="indefinite"
                />
              )}
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={horizontal}
            horizontal={!horizontal}
            strokeDasharray="2 6"
          />
          {horizontal ? (
            <>
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                allowDecimals={allowDecimals}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={115}
                axisLine={false}
                tickLine={false}
                tick={
                  onSelect
                    ? ({
                        x,
                        y,
                        payload,
                      }: {
                        x?: number | string;
                        y?: number | string;
                        payload?: { value: string };
                      }) => (
                        <g
                          transform={`translate(${x},${y})`}
                          role="button"
                          tabIndex={0}
                          aria-label={selectionLabel(payload?.value ?? "")}
                          onClick={() => payload && onSelect(payload.value)}
                          onKeyDown={(event) => {
                            if (
                              payload &&
                              (event.key === "Enter" || event.key === " ")
                            ) {
                              event.preventDefault();
                              onSelect(payload.value);
                            }
                          }}
                          className="geography-chart-label"
                        >
                          <text
                            x={-8}
                            y={0}
                            dy={4}
                            textAnchor="end"
                            fontSize={11}
                            fill="currentColor"
                          >
                            {payload && payload.value.length > 18
                              ? payload.value.slice(0, 17) + "…"
                              : payload?.value}
                          </text>
                        </g>
                      )
                    : { fontSize: 11 }
                }
                tickFormatter={(v) =>
                  v.length > 18 ? v.slice(0, 17) + "…" : v
                }
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
                minTickGap={16}
                tickFormatter={(v) =>
                  v.length > 12 ? v.slice(0, 8) + "…" + v.slice(-2) : v
                }
              />
              <YAxis
                allowDecimals={unit !== "instalações"}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => number(v)}
                width={55}
              />
            </>
          )}
          <Tooltip
            wrapperStyle={{ zIndex: "var(--z-chart-tooltip)" }}
            content={<ChartTooltip unit={unit} color={color} />}
            cursor={{
              fill: "#ecfdf5",
              stroke: `url(#${gradientId}-cursor)`,
              strokeWidth: 0.45,
              radius: 5,
            }}
            contentStyle={{
              borderRadius: 12,
              fontSize: 12,
              background: "hsl(var(--card))",
              color: "hsl(var(--foreground))",
            }}
            formatter={(v) => [
              `${number(Number(v))} ${unit}`,
              "Valor registrado",
            ]}
          />
          <Bar
            onClick={
              onSelect ? (_, index) => onSelect(data[index].name) : undefined
            }
            cursor={onSelect ? "pointer" : undefined}
            isAnimationActive={animate && !reducedMotion}
            animationBegin={0}
            animationDuration={750}
            animationEasing="ease-out"
            dataKey="value"
            fill={`url(#${gradientId})`}
            activeBar={false}
            background={
              horizontal ? { fill: "hsl(var(--muted))", radius: 5 } : undefined
            }
            radius={horizontal ? [0, 5, 5, 0] : [7, 7, 0, 0]}
            maxBarSize={horizontal ? 15 : 36}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
export function Trend({
  data,
  unit,
  color = "#059669",
}: {
  data: { name: string; value: number }[];
  unit: string;
  color?: string;
}) {
  const gradientId = `area-${useId().replace(/:/g, "")}`;
  if (data.length < 2)
    return (
      <EmptyState
        compact
        title="Histórico insuficiente"
        description="A evolução exige pelo menos dois períodos anuais da mesma instalação, indicador e unidade."
      />
    );
  return (
    <div
      className="chart-wrap"
      role="img"
      aria-label={`Evolução histórica em ${unit}: ${data.map((d) => `${displayValue(d.name)}: ${number(d.value)}`).join("; ")}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data.map((row) => ({ ...row, name: displayValue(row.name) }))}
          margin={{ right: 20, left: 0, top: 20, bottom: 10 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.24} />
              <stop offset="65%" stopColor={color} stopOpacity={0.07} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="2 6" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => number(v)}
          />
          <Tooltip
            wrapperStyle={{ zIndex: "var(--z-chart-tooltip)" }}
            content={<ChartTooltip unit={unit} color={color} />}
            cursor={{
              stroke: "hsl(var(--muted-foreground))",
              strokeWidth: 1,
              strokeDasharray: "3 5",
            }}
            contentStyle={{ borderRadius: 12, background: "hsl(var(--card))" }}
            formatter={(v) => [`${number(Number(v))} ${unit}`, "Valor"]}
          />
          <Area
            type="monotone"
            dataKey="value"
            fill={`url(#${gradientId})`}
            stroke="none"
            isAnimationActive={false}
            activeDot={false}
            tooltipType="none"
            legendType="none"
          />
          <Line
            isAnimationActive={false}
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
            dot={{ r: 2.5, fill: color, strokeWidth: 0 }}
            activeDot={{
              r: 5,
              fill: "hsl(var(--card))",
              stroke: color,
              strokeWidth: 2.5,
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
export function Distribution({
  data,
}: {
  data: { name: string; value: number; color?: string }[];
}) {
  const gradientId = `distribution-${useId().replace(/:/g, "")}`;
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const distributionData = useMemo(
    () =>
      data.map((row, i) => ({
        ...row,
        name: displayValue(row.name),
        color: row.color ?? colors[i % colors.length],
      })),
    [data],
  );
  const sliceCells = useMemo(
    () =>
      data.map((d, i) => (
        <Cell
          key={displayValue(d.name)}
          className="distribution-slice"
          fill={`url(#${gradientId}-${i})`}
          style={{ opacity: `var(--distribution-opacity-${i}, 1)` }}
        />
      )),
    [data, gradientId],
  );
  const ring = useMemo(
    () => (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <defs>
            {data.map((d, i) => (
              <linearGradient
                key={displayValue(d.name)}
                id={`${gradientId}-${i}`}
                x1="0"
                y1="0"
                x2="1"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor={d.color ?? colors[i % colors.length]}
                  stopOpacity={1}
                />
                <stop
                  offset="100%"
                  stopColor={d.color ?? colors[i % colors.length]}
                  stopOpacity={0.5}
                />
              </linearGradient>
            ))}
          </defs>
          <Pie
            data={[{ value: 1 }]}
            dataKey="value"
            innerRadius="75%"
            outerRadius="90%"
            fill="hsl(var(--muted))"
            stroke="none"
            isAnimationActive={false}
            tooltipType="none"
            legendType="none"
          />
          <Pie
            isAnimationActive={false}
            data={distributionData}
            dataKey="value"
            nameKey="name"
            innerRadius="75%"
            outerRadius="90%"
            paddingAngle={2}
            cornerRadius={4}
            stroke="none"
            onMouseEnter={(_, index) => setActiveIndex(index)}
            startAngle={90}
            endAngle={-270}
          >
            {sliceCells}
          </Pie>
          <Tooltip
            wrapperStyle={{ zIndex: "var(--z-chart-tooltip)" }}
            content={<ChartTooltip unit="registros" color="var(--resources)" />}
            cursor={false}
          />
        </PieChart>
      </ResponsiveContainer>
    ),
    [data, distributionData, sliceCells, gradientId],
  );
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (!data.length) return <EmptyState compact />;
  return (
    <div
      className="distribution distribution-refined"
      style={
        Object.fromEntries(
          data.map((_, i) => [
            `--distribution-opacity-${i}`,
            activeIndex == null || activeIndex === i ? 1 : 0.5,
          ]),
        ) as CSSProperties
      }
      onMouseLeave={() => setActiveIndex(null)}
    >
      <div
        className="donut"
        role="img"
        aria-label={`Distribuição de registros: ${data.map((d) => `${displayValue(d.name)}: ${d.value}`).join("; ")}`}
      >
        {ring}
        <div className="donut-center">
          <small>
            {activeIndex == null
              ? "COBERTURA TOTAL"
              : displayValue(data[activeIndex]?.name)}
          </small>
          <strong>
            {number(
              activeIndex == null ? total : (data[activeIndex]?.value ?? total),
              0,
            )}
          </strong>
          <span>
            {activeIndex == null
              ? "evidências cadastradas"
              : `${number(total ? ((data[activeIndex]?.value ?? 0) / total) * 100 : 0, 1)}% das evidências`}
          </span>
        </div>
      </div>
      <div className="chart-legend">
        {data.map((d, i) => (
          <button
            className={`distribution-item ${activeIndex === i ? "is-highlighted" : ""}`}
            key={displayValue(d.name)}
            onMouseEnter={() => setActiveIndex(i)}
            onFocus={() => setActiveIndex(i)}
            onBlur={() => setActiveIndex(null)}
            onClick={() => setActiveIndex(i)}
            aria-label={`${displayValue(d.name)}: ${d.value} registros, ${number(total ? (d.value / total) * 100 : 0, 1)}% das evidências`}
            aria-pressed={activeIndex === i}
          >
            <span>
              <i style={{ background: d.color ?? colors[i % colors.length] }} />
              {displayValue(d.name)}
            </span>
            <strong>
              {number(d.value, 0)}
              <small>{number(total ? (d.value / total) * 100 : 0, 1)}%</small>
            </strong>
            <span className="distribution-track">
              <i
                style={{
                  width: `${total ? (d.value / total) * 100 : 0}%`,
                  background: `linear-gradient(90deg, color-mix(in srgb, ${d.color ?? colors[i % colors.length]} 45%, transparent), ${d.color ?? colors[i % colors.length]})`,
                }}
              />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
