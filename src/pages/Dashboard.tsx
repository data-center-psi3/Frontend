import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  Building2,
  MapPin,
  Zap,
  Droplets,
  Leaf,
  Recycle,
  Layers,
  BookOpen,
  ShieldCheck,
  Database,
  Info,
} from "lucide-react";
import { Panel, SourceReference } from "../components/common";
import { FilterSelect } from "../components/ui/filter-select";
import { Tabs } from "../components/ui/tabs";
import { Bars, Distribution, Trend } from "../components/charts/IndicatorChart";
import { GeographicDistribution } from "../components/charts/GeographicDistribution";
import { DataCenterMap } from "../components/maps/DataCenterMap";
import { EnvironmentalMetricCard } from "../components/EnvironmentalMetricCard";
import { InfoTooltip } from "../components/ui/tooltip";
import type { Dataset, DataCenter, Indicator } from "../types/api";
import { categories, categoryOf, number, displayValue } from "../utils/data";
import {
  annualSeries,
  consumptionRecords,
  representativeRecord,
} from "../utils/analytics";
import { indicatorColor, indicatorColors } from "../constants/design";
export interface ViewProps {
  data: Dataset;
  centers: DataCenter[];
  indicators: Indicator[];
}
export function Dashboard({ data, centers, indicators }: ViewProps) {
  const navigate = useNavigate();
  const [type, setType] = useState("");
  const [unitChoice, setUnit] = useState("");
  const [periodChoice, setPeriod] = useState("");
  const [view, setView] = useState("comparacao");
  const [centerChoice, setCenter] = useState("");
  const types = [...new Set(indicators.map((i) => i.tipo))];
  const activeType = types.includes(type) ? type : (types[0] ?? "");
  const units = [
    ...new Set(
      indicators
        .filter((i) => i.tipo === activeType)
        .map((i) => i.unidade)
        .filter((u): u is string => !!u),
    ),
  ];
  const unit = units.includes(unitChoice) ? unitChoice : (units[0] ?? "");
  const periods = [
    ...new Set(
      indicators
        .filter((i) => i.tipo === activeType && i.unidade === unit)
        .map((i) => i.periodo)
        .filter((p): p is string => !!p),
    ),
  ].sort();
  const period = periods.includes(periodChoice)
    ? periodChoice
    : (periods.at(-1) ?? "");
  const scopedRecords = indicators.filter(
    (i) =>
      i.tipo === activeType &&
      i.unidade === unit &&
      i.periodo === period &&
      !!unit &&
      !!period,
  );
  const records = scopedRecords.filter((i) => i.valor != null);
  const chart = records.map((i) => ({
    name:
      centers.find((c) => c.id === i.dataCenterId)?.nome ??
      String(i.dataCenterId),
    value: i.valor!,
  }));
  const availableCenters = centers.filter((c) =>
    indicators.some(
      (i) =>
        i.dataCenterId === c.id && i.tipo === activeType && i.unidade === unit,
    ),
  );
  const activeCenter = availableCenters.some(
    (c) => String(c.id) === centerChoice,
  )
    ? centerChoice
    : String(availableCenters[0]?.id ?? "");
  const series = annualSeries(
    indicators,
    Number(activeCenter),
    activeType,
    unit,
  );
  const points = data.points.filter((p) => centers.some((c) => c.id === p.id));
  const distribution = [...categories, { key: "outros", label: "Outros" }]
    .map((c) => ({
      name: c.label,
      value: indicators.filter((i) => categoryOf(i.tipo) === c.key).length,
      color: indicatorColors[c.key as keyof typeof indicatorColors],
    }))
    .filter((c) => c.value > 0);
  const icons = [Zap, Droplets, Leaf, Recycle, Layers];
  const labels = [
    "Consumo de energia",
    "Consumo de água",
    "Emissões de GEE",
    "Resíduos eletrônicos",
    "Recursos naturais",
  ];
  const sources = data.sources.filter((s) =>
    (view === "historico"
      ? indicators.filter(
          (i) =>
            i.dataCenterId === Number(activeCenter) &&
            i.tipo === activeType &&
            i.unidade === unit,
        )
      : scopedRecords
    ).some((i) => i.fonteId === s.id),
  );
  return (
    <>
      <div className="coverage-strip" aria-label="Cobertura dos dados">
        <span>
          <Building2 size={16} />
          <strong>{number(centers.length, 0)}</strong> instalações cadastradas
        </span>
        <span>
          <MapPin size={16} />
          <strong>{number(points.length, 0)}</strong> localizações disponíveis
        </span>
        <span>
          <Database size={16} />
          <strong>{number(indicators.length, 0)}</strong> evidências ambientais
        </span>
        <Link to="/fontes">
          <ShieldCheck size={15} />
          Fontes verificáveis
          <ArrowUpRight size={14} />
        </Link>
      </div>
      <div className="section-heading">
        <div>
          <h2>Panorama ambiental</h2>
          <p>Medidas disponíveis e limites das evidências na seleção atual.</p>
        </div>
        <span className="scope-badge">Dados históricos e institucionais</span>
      </div>
      <div className="environmental-kpis">
        {categories.map((c, index) => {
          const related = indicators.filter(
            (i) => categoryOf(i.tipo) === c.key,
          );
          const record = representativeRecord(
            consumptionRecords(indicators, c.key),
          );
          return (
            <EnvironmentalMetricCard
              key={c.key}
              category={c.key}
              label={labels[index]}
              icon={icons[index]}
              description={c.description}
              record={record}
              relatedCount={related.length}
              center={centers.find((v) => v.id === record?.dataCenterId)}
              source={data.sources.find((s) => s.id === record?.fonteId)}
            />
          );
        })}
      </div>
      <div className="data-context">
        <Info size={16} />
        <p>
          Os valores acima identificam um registro de referência, quando
          disponível. PUE e WUE são índices de eficiência; não substituem
          medições de consumo. Ausência de dados não representa impacto zero.
        </p>
      </div>
      <div className="dashboard-analytics">
        <Panel
          title="Panorama dos indicadores"
          subtitle="Compare registros equivalentes ou explore o histórico de uma instalação"
          action={
            <InfoTooltip text="Cada comparação mantém o mesmo tipo, unidade e período. Séries históricas usam anos válidos, sem registros duplicados." />
          }
        >
          <Tabs
            value={view}
            onChange={setView}
            items={[
              { value: "comparacao", label: "Por instalação" },
              { value: "historico", label: "Evolução histórica" },
            ]}
          />
          <div className="chart-controls">
            <FilterSelect
              label="Indicador"
              value={activeType}
              onChange={(v) => {
                setType(v);
                setUnit("");
                setPeriod("");
              }}
              options={types.map((value) => ({ value, label: value }))}
            />
            <FilterSelect
              label="Unidade"
              value={unit}
              onChange={setUnit}
              options={units.map((value) => ({ value, label: value }))}
            />
            {view === "comparacao" ? (
              <FilterSelect
                label="Período"
                value={period}
                onChange={setPeriod}
                options={periods.map((value) => ({ value, label: value }))}
              />
            ) : (
              <FilterSelect
                label="Instalação"
                value={activeCenter}
                onChange={setCenter}
                options={availableCenters.map((c) => ({
                  value: String(c.id),
                  label: c.nome,
                }))}
              />
            )}
          </div>
          {view === "comparacao" ? (
            <Bars data={chart} unit={unit} color={indicatorColor(activeType)} />
          ) : (
            <Trend
              data={series}
              unit={unit}
              color={indicatorColor(activeType)}
            />
          )}
          <div className="chart-footnote">
            <span>
              <i style={{ background: indicatorColor(activeType) }} />
              {activeType || "Sem medida disponível"}
            </span>
            <span>
              {displayValue(unit)} ·{" "}
              {view === "comparacao"
                ? displayValue(period)
                : activeCenter
                  ? availableCenters.find((c) => String(c.id) === activeCenter)
                      ?.nome
                  : "Sem instalação"}
            </span>
          </div>
          <div className="chart-sources">
            <span>Fontes:</span>
            {sources.length ? (
              sources
                .slice(0, 3)
                .map((s) => <SourceReference key={s.id} source={s} />)
            ) : (
              <span>Não informado</span>
            )}
            {sources.length > 3 && (
              <Link className="source-link" to="/indicadores">
                Consultar {sources.length} fontes nos registros
                <ArrowUpRight size={12} />
              </Link>
            )}
          </div>
        </Panel>
        <Panel
          title="Cobertura das evidências"
          subtitle="Distribuição dos registros por dimensão ambiental"
        >
          <Distribution data={distribution} />
          <p className="chart-explanation">
            Contagem de evidências cadastradas. A distribuição não mede a
            participação de cada dimensão nos impactos ambientais.
          </p>
        </Panel>
      </div>
      <div className="dashboard-bottom">
        <Panel
          title="A infraestrutura no território"
          subtitle="Instalações com coordenadas disponíveis na seleção"
          action={
            <Link className="subtle-link" to="/mapa">
              Explorar mapa
              <ArrowUpRight size={15} />
            </Link>
          }
        >
          <DataCenterMap
            points={points}
            compact
            onSelect={(id) => navigate(`/mapa?selected=${id}`)}
          />
        </Panel>
        <Panel
          title="Uma leitura responsável dos dados"
          subtitle="Contexto para transformar números em compreensão"
        >
          <div className="insight-row">
            <span className="icon-box energia">
              <Zap size={19} />
            </span>
            <div>
              <h3>Capacidade não é consumo</h3>
              <p>
                MW descreve potência. kWh ou MWh expressam energia consumida em
                um período.
              </p>
            </div>
          </div>
          <div className="insight-row">
            <span className="icon-box agua">
              <BookOpen size={19} />
            </span>
            <div>
              <h3>A fonte faz parte do indicador</h3>
              <p>
                Método, data e origem ajudam a interpretar cada registro e suas
                limitações.
              </p>
              <Link to="/fontes">
                Conhecer a metodologia
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
          <div className="insight-row">
            <span className="icon-box recursos">
              <Leaf size={19} />
            </span>
            <div>
              <h3>Informação qualitativa também conta</h3>
              <p>
                Descrições de refrigeração e eficiência continuam relevantes
                quando não há medição numérica.
              </p>
            </div>
          </div>
        </Panel>
      </div>
      <GeographicDistribution centers={centers} />
    </>
  );
}
