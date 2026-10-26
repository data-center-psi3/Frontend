import { useMemo, useState, useLayoutEffect } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useRadarQueries } from "../../queries/radar";
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  Globe2,
  LocateFixed,
  MapPin,
  Network,
  Radio,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import { Panel, EmptyState } from "../../components/common";
import { Dialog } from "../../components/ui/dialog";
import { FilterSelect } from "../../components/ui/filter-select";
import { RadarGeographicChart } from "../../components/charts/RadarGeographicChart";
import { Bars } from "../../components/charts/IndicatorChart";
import { MapModeToggle } from "../../components/maps/MapModeToggle";
import { RadarMap } from "../../components/maps/RadarMap";
import { displayValue, normalize, number, safeUrl } from "../../utils/data";
import { stateKey, stateName } from "../../utils/geography";
import {
  heatSupported,
  heatWeight,
  radarMetrics,
  radarRegion,
  radarPalette,
  radarValue,
  rankRadar,
  ufCodes,
  validNumber,
  validRadarPoint,
} from "../../utils/radar";
import type { Connection } from "../../types/api";
import type {
  RadarFilters,
  RadarMetric,
  RadarView,
  RadarPoint,
} from "../../types/radar";
import "./radar.css";

function QueryNotice({
  query,
  name,
}: {
  query: { isPending: boolean; isError: boolean; refetch: () => unknown };
  name: string;
}) {
  return query.isPending ? (
    <p className="radar-status" role="status">
      Carregando {name}…
    </p>
  ) : query.isError ? (
    <div className="radar-error" role="alert">
      <span>Não foi possível carregar {name}.</span>
      <button onClick={() => query.refetch()}>Tentar novamente</button>
    </div>
  ) : null;
}
export function RadarPage({
  connection,
  onClose,
  onOpenInstallation,
  onViewReady,
}: {
  connection: Connection;
  onClose?: () => void;
  onOpenInstallation?: (id: number) => void;
  onViewReady?: () => void;
}) {
  useLayoutEffect(() => {
    onViewReady?.();
  }, [onViewReady]);
  const [params, setParams] = useSearchParams();
  const route = useParams<{ uf: string }>();
  const navigate = useNavigate();
  const useImports = import.meta.env.VITE_RADAR_DATA_SOURCE === "imports";
  const isolatedApi =
    useImports || import.meta.env.VITE_RADAR_ISOLATED === "true";
  const [selectedRadarPoint, setSelectedRadarPoint] = useState<RadarPoint>();
  const [resetKey, setResetKey] = useState(0);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name");
  const [page, setPage] = useState(0);
  const filters = useMemo<RadarFilters>(
    () => ({
      uf: (route.uf ?? params.get("uf") ?? "").toUpperCase(),
      region: params.get("region") ?? "",
      operator: params.get("operator") ?? "",
      installationType: params.get("installationType") ?? "",
    }),
    [params, route.uf],
  );
  const validUf = !filters.uf || Object.values(ufCodes).includes(filters.uf);
  const requestedMetric = params.get("metric") ?? "installations";
  const metric: RadarMetric = Object.hasOwn(radarMetrics, requestedMetric)
    ? (requestedMetric as RadarMetric)
    : "installations";
  const requestedView = params.get("view") ?? (onClose ? "heat" : "states");
  const view: RadarView =
    requestedView === "heat"
      ? heatSupported(metric)
        ? "heat"
        : "states"
      : requestedView === "markers"
        ? "markers"
        : "states";
  const metadata = radarMetrics[metric];
  const {
    imported,
    importedModel,
    overview,
    states,
    options,
    detail,
    cities,
    operators,
    points,
    installations,
  } = useRadarQueries({
    connection,
    filters,
    metric,
    validUf,
    useImports,
    isolatedApi,
  });
  const tableQuery = useImports
    ? imported
    : isolatedApi
      ? points
      : installations;
  function update(patch: Record<string, string>, replace = false) {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([key, value]) =>
      value ? next.set(key, value) : next.delete(key),
    );
    next.set("mode", "radar");
    setPage(0);
    setSearch("");
    if (route.uf && "uf" in patch && patch.uf !== route.uf)
      navigate(`/radar?${next.toString()}`, { replace });
    else setParams(next, { replace });
  }
  function chooseState(uf: string) {
    update({ uf });
  }
  function reset() {
    update({ uf: "", region: "", operator: "", installationType: "" });
    setResetKey((value) => value + 1);
  }
  function openInstallation(id: number) {
    if (isolatedApi) {
      setSelectedRadarPoint(
        (useImports ? importedModel.records(filters) : points.data)?.find(
          (point) => point.id === id,
        ),
      );
      return;
    }
    if (onOpenInstallation) onOpenInstallation(id);
    else navigate(`/mapa?selected=${id}&from=radar`);
  }
  const stateRows = rankRadar(states.data ?? [], metric);
  const cityRows = rankRadar(cities.data ?? [], metric);
  const scope = filters.uf ? stateName(filters.uf) : "Brasil";
  const scopedState = detail.data?.indicadores;
  const stats = scopedState
    ? { ...overview.data, ...scopedState }
    : overview.data;
  const mapPoints = useMemo(
    () => (points.data ?? []).filter(validRadarPoint),
    [points.data],
  );
  const weightedPoints = mapPoints.filter(
    (point) => heatWeight(point, metric) !== null,
  );
  const knownValues = stateRows
    .map((row) => radarValue(row, metric))
    .filter((value): value is number => value !== null);
  const maximum = Math.max(0, ...knownValues);
  const scopedTableRows = useMemo(() => {
    const source = isolatedApi
      ? (useImports ? importedModel.records(filters) : mapPoints).map(
          (point) => ({
            id: point.id,
            nome: point.unidade,
            empresa: point.operador,
            cidade: point.municipio,
            estado: point.uf,
            pais: "Brasil",
            tipoInstalacao: point.tipoInstalacao,
          }),
        )
      : (installations.data ?? []);
    const rows = source.filter(
      (row) =>
        stateKey(row.estado) === filters.uf &&
        (!filters.region ||
          normalize(radarRegion(filters.uf)) === normalize(filters.region)) &&
        ["br", "bra", "brasil", "brazil"].includes(
          normalize(row.pais).trim(),
        ) &&
        (!filters.operator ||
          normalize(row.empresa ?? "").trim() ===
            normalize(filters.operator).trim()) &&
        (!filters.installationType ||
          normalize(row.tipoInstalacao ?? "").trim() ===
            normalize(filters.installationType).trim()),
    );
    return rows.sort((a, b) =>
      displayValue(
        sort === "city" ? a.cidade : sort === "operator" ? a.empresa : a.nome,
      ).localeCompare(
        displayValue(
          sort === "city" ? b.cidade : sort === "operator" ? b.empresa : b.nome,
        ),
        "pt-BR",
      ),
    );
  }, [
    isolatedApi,
    useImports,
    importedModel,
    filters,
    mapPoints,
    installations.data,
    sort,
  ]);
  const tableRows = scopedTableRows.filter((row) =>
    normalize(
      `${row.nome} ${row.empresa ?? ""} ${row.cidade} ${row.tipoInstalacao ?? ""}`,
    ).includes(normalize(search)),
  );
  const currentPage = Math.min(
    page,
    Math.max(0, Math.ceil(tableRows.length / 10) - 1),
  );
  const pointById = new Map(
    (useImports ? importedModel.records(filters) : mapPoints).map((point) => [
      point.id,
      point,
    ]),
  );
  if (useImports && imported.isError)
    return (
      <section className="radar-page">
        <button
          className="radar-back"
          onClick={() => (onClose ? onClose() : navigate("/mapa"))}
        >
          Localizações
        </button>
        <QueryNotice query={imported} name="registros importados do Radar" />
      </section>
    );
  if (!validUf)
    return (
      <div className="radar-error" role="alert">
        UF inválida. <button onClick={reset}>Voltar ao Brasil</button>
      </div>
    );
  const metricGroup =
    metric === "installations"
      ? "installations"
      : metric === "operators"
        ? "operators"
        : "connectivity";
  const kpis = [
    {
      key: "totalInstalacoes",
      label: "Instalações",
      icon: Building2,
      tone: "green",
      help: "Cadastros brasileiros no recorte selecionado, inclusive sem coordenadas.",
    },
    {
      key: "totalOperadores",
      label: "Operadores distintos",
      icon: Users,
      tone: "purple",
      help: "Operadores identificados, contados uma vez dentro do recorte.",
    },
    {
      key: "totalMunicipios",
      label: "Municípios",
      icon: MapPin,
      tone: "blue",
      help: "Municípios representados; nomes iguais em UFs distintas não são somados como um município.",
    },
    {
      key: "totalEstados",
      label: "Estados",
      icon: Globe2,
      tone: "green",
      help: "UFs brasileiras representadas nos filtros atuais.",
    },
    {
      key: "instalacoesComCoordenadas",
      label: "Com coordenadas",
      icon: LocateFixed,
      tone: "orange",
      help: "Instalações com latitude e longitude válidas para aparecer no mapa.",
    },
    {
      key: "totalRedesRegistradas",
      label: "Redes registradas",
      icon: Network,
      tone: "energia",
      help: "Soma dos valores informados por instalação; não corresponde a redes únicas.",
    },
  ] as const;
  return (
    <section className="radar-page" aria-label="Radar de concentração">
      <header className="radar-heading">
        <div>
          <span className="territory-eyebrow">
            INTELIGÊNCIA GEOGRÁFICA · {scope}
          </span>
          <h2>Radar de Concentração</h2>
          <p>
            Explore a distribuição geográfica, os operadores e a conectividade
            dos Data Centers brasileiros.
          </p>
        </div>
        <button
          className="radar-back"
          onClick={() => (onClose ? onClose() : navigate("/mapa"))}
        >
          <MapPin size={16} />
          Localizações
        </button>
      </header>
      {!useImports && isolatedApi && (
        <p className="radar-method-note" role="status">
          O Radar utiliza um inventário independente das localizações. Os totais
          das duas visualizações podem ser diferentes.
        </p>
      )}
      {useImports && (
        <p className="radar-method-note" role="status">
          Fonte: registros importados da API. Indicadores calculados sobre o
          levantamento cadastrado.
          {importedModel.excludedRows > 0
            ? ` ${importedModel.excludedRows} registros sem UF brasileira válida foram excluídos.`
            : ""}
        </p>
      )}
      <nav className="radar-breadcrumb" aria-label="Navegação do Radar">
        <button onClick={() => chooseState("")}>Brasil</button>
        {filters.uf && (
          <>
            <span>/</span>
            <strong>
              {scope} · {filters.uf}
            </strong>
          </>
        )}
      </nav>
      <div className="radar-kpis" aria-label={`Indicadores de ${scope}`}>
        {kpis.map(({ key, label, icon: Icon, tone, help }) => (
          <div className="radar-kpi" key={key}>
            <span className={`icon-box ${tone}`}>
              <Icon size={17} />
            </span>
            <div>
              <span title={help} tabIndex={0} aria-label={`${label}. ${help}`}>
                {label}
              </span>
              {overview.isPending && !stats ? (
                <i
                  className="skeleton radar-number-skeleton"
                  aria-label="Carregando indicador"
                />
              ) : (
                <strong>{number(stats?.[key])}</strong>
              )}
            </div>
          </div>
        ))}
      </div>
      <QueryNotice query={overview} name={`indicadores de ${scope}`} />
      <div className="radar-filters">
        <span className="radar-filter-icon">
          <SlidersHorizontal size={17} />
        </span>
        <FilterSelect
          label="Região do Radar"
          value={filters.region}
          onChange={(region) => update({ region, uf: "" })}
          options={(options.data?.regions ?? []).map((value) => ({
            value,
            label: value,
          }))}
        />
        <FilterSelect
          label="Estado do Radar"
          value={filters.uf}
          onChange={(uf) => update({ uf })}
          options={(options.data?.states ?? []).map((value) => ({
            value,
            label: `${stateName(value)} / ${value}`,
          }))}
        />
        <FilterSelect
          label="Operador do Radar"
          value={filters.operator}
          onChange={(operator) => update({ operator })}
          options={(options.data?.operators ?? []).map((value) => ({
            value,
            label: value,
          }))}
        />
        <FilterSelect
          label="Tipo de instalação do Radar"
          value={filters.installationType}
          onChange={(installationType) => update({ installationType })}
          options={(options.data?.installationTypes ?? []).map((value) => ({
            value,
            label: value,
          }))}
        />
        <button className="radar-clear" onClick={reset}>
          <RotateCcw size={14} />
          Limpar filtros
        </button>
      </div>
      <QueryNotice query={options} name="opções de filtros" />
      <div
        className="radar-active-filters"
        aria-label="Filtros ativos do Radar"
      >
        {(Object.keys(filters) as (keyof RadarFilters)[])
          .filter((key) => filters[key])
          .map((key) => (
            <button
              key={key}
              onClick={() => update({ [key]: "" })}
              aria-label={`Remover filtro ${key}: ${filters[key]}`}
            >
              {key === "uf" ? stateName(filters[key]) : filters[key]}
              <X size={12} />
            </button>
          ))}
      </div>
      <div className="radar-toolbar">
        <div className="radar-segmented" aria-label="Métrica de concentração">
          {[
            { key: "installations", label: "Instalações", icon: Building2 },
            { key: "operators", label: "Operadores", icon: Users },
            { key: "connectivity", label: "Conectividade", icon: Network },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              aria-pressed={metricGroup === key}
              onClick={() => {
                const next = key === "connectivity" ? "networks" : key;
                update({
                  metric: next,
                  ...(view === "heat" && next === "operators"
                    ? { view: "states" }
                    : {}),
                });
              }}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
        {metricGroup === "connectivity" && (
          <div className="radar-connectivity">
            <FilterSelect
              label="Indicador de conectividade"
              allowEmpty={false}
              value={metric}
              onChange={(value) =>
                update({
                  metric: value,
                  ...(view === "heat" && value === "averageNetworks"
                    ? { view: "states" }
                    : {}),
                })
              }
              options={(
                ["networks", "averageNetworks", "ix", "carriers"] as const
              ).map((key) => ({ value: key, label: radarMetrics[key].label }))}
            />
          </div>
        )}
        <div
          className="radar-segmented radar-view-switch"
          aria-label="Visualização geográfica"
        >
          {(
            [
              { key: "states", label: "Por estados" },
              { key: "heat", label: "Mapa de calor" },
              { key: "markers", label: "Marcadores" },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              aria-pressed={view === key}
              disabled={key === "heat" && !heatSupported(metric)}
              title={
                key === "heat" && !heatSupported(metric)
                  ? "Densidade de pontos não representa operadores distintos nem médias de redes."
                  : undefined
              }
              onClick={() => update({ view: key })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {!heatSupported(metric) && (
        <p className="radar-method-note">
          {metric === "operators"
            ? "Operadores são contados de forma distinta por estado. A densidade de instalações não representa diversidade de operadores."
            : "Médias de redes consideram somente instalações com informação válida. Essa métrica não é somada em um mapa de calor."}
        </p>
      )}
      <div className="radar-main-grid">
        <div className="radar-map-panel">
          <div className="radar-map-heading">
            <div>
              <h3>{scope}</h3>
              <p>{metadata.unit}</p>
            </div>
            <div className="radar-map-actions">
              <button
                aria-label="Restaurar visão nacional do Radar"
                title="Restaurar visão nacional do Radar"
                onClick={() => {
                  chooseState("");
                  setResetKey((value) => value + 1);
                }}
              >
                <LocateFixed size={18} />
              </button>
              <MapModeToggle
                mode="radar"
                onChange={() => (onClose ? onClose() : navigate("/mapa"))}
              />
            </div>
          </div>
          <RadarMap
            states={states.data ?? []}
            statesAvailable={states.isSuccess}
            points={mapPoints}
            metric={metric}
            view={view}
            uf={filters.uf}
            resetKey={resetKey}
            onState={chooseState}
            onOpen={openInstallation}
          />
          <div className="radar-legend" aria-label="Legenda do mapa">
            {view === "states" ? (
              <>
                <strong>{metadata.label}</strong>
                <div className="radar-scale">
                  {radarPalette.map((color, index) => (
                    <span key={color}>
                      <i style={{ background: color }} />
                      {number(
                        (maximum * index) / 5,
                        metric === "averageNetworks" || maximum < 5 ? 1 : 0,
                      )}
                      –
                      {number(
                        (maximum * (index + 1)) / 5,
                        metric === "averageNetworks" || maximum < 5 ? 1 : 0,
                      )}
                    </span>
                  ))}
                </div>
                <span>
                  Neutro: sem registros ou sem informação válida; consulte o
                  estado.
                </span>
              </>
            ) : view === "heat" ? (
              <>
                <strong>Densidade relativa · {metadata.unit}</strong>
                <div className="radar-heat-scale" />
                <span>
                  Menor concentração <span>Maior concentração</span>
                </span>
                <small>
                  Intensidade normalizada no campo visível; varia com o zoom.{" "}
                  {metric !== "installations"
                    ? `${weightedPoints.length} de ${mapPoints.length} pontos têm o indicador informado. Valores ausentes não recebem peso.`
                    : "Cada instalação com coordenadas contribui com um ponto."}
                </small>
              </>
            ) : (
              <span>
                {number(mapPoints.length)} instalações georreferenciadas.
                Agrupamentos se desdobram com o zoom.
              </span>
            )}
          </div>
          <QueryNotice
            query={view === "states" ? states : points}
            name={
              view === "states" ? "indicadores estaduais" : "pontos geográficos"
            }
          />
          {overview.data?.totalInstalacoes === 0 && (
            <EmptyState
              compact
              title="Nenhum Data Center encontrado para os filtros selecionados."
            />
          )}
          {points.isSuccess &&
            view !== "states" &&
            !mapPoints.length &&
            overview.data?.totalInstalacoes !== 0 && (
              <p className="radar-method-note">
                Não há coordenadas válidas para este recorte. Consulte os
                rankings e a tabela.
              </p>
            )}
          {view === "heat" &&
            metric !== "installations" &&
            points.isSuccess &&
            mapPoints.length > 0 &&
            !weightedPoints.length && (
              <p className="radar-method-note">
                Não informado: nenhum ponto tem valor válido para ponderar este
                indicador.
              </p>
            )}
        </div>
        <aside className="radar-side">
          <Panel
            title={filters.uf ? "Municípios em foco" : "Estados em foco"}
            subtitle={metadata.unit}
          >
            <QueryNotice
              query={filters.uf ? cities : states}
              name="ranking geográfico"
            />
            <ol className="radar-ranking">
              {(filters.uf ? cityRows : stateRows)
                .slice(0, 10)
                .map((row, index) => {
                  const value = radarValue(row, metric);
                  const city = "municipio" in row;
                  return (
                    <li
                      key={
                        city
                          ? `${row.uf}:${row.codigoIbge}:${row.municipio}`
                          : row.uf
                      }
                    >
                      <button
                        onClick={() => {
                          if (city) {
                            setSearch(row.municipio);
                            setPage(0);
                            document
                              .getElementById("radar-installations")
                              ?.scrollIntoView({ behavior: "smooth" });
                          } else chooseState(row.uf);
                        }}
                      >
                        <span className="radar-rank-number">{index + 1}</span>
                        <span>
                          {city ? row.municipio : stateName(row.uf)}
                          <small>
                            {city
                              ? row.uf
                              : `${number(row.totalInstalacoes)} instalações`}
                          </small>
                        </span>
                        <strong>{number(value)}</strong>
                      </button>
                    </li>
                  );
                })}
            </ol>
            {(filters.uf ? cities : states).isSuccess &&
              !(filters.uf ? cityRows : stateRows).length && (
                <p className="radar-status">Sem registros no recorte.</p>
              )}
          </Panel>
          {filters.uf && (
            <Panel
              title={scope}
              subtitle={`UF ${filters.uf} · contexto selecionado`}
            >
              <QueryNotice query={detail} name="detalhamento estadual" />
              {scopedState && (
                <>
                  <p className="radar-share">
                    <strong>{number(scopedState.participacaoNacional)}%</strong>{" "}
                    da base nacional
                  </p>
                  <div className="radar-share-track">
                    <span
                      style={{
                        width: `${Math.min(100, Math.max(0, scopedState.participacaoNacional ?? 0))}%`,
                      }}
                    />
                  </div>
                  <p className="radar-method-note">
                    {number(scopedState.totalInstalacoes)} instalações no
                    recorte. Participação calculada sobre toda a base nacional,
                    sem filtros.
                  </p>
                  <dl className="radar-state-stats">
                    <dt>Operadores distintos</dt>
                    <dd>{number(scopedState.totalOperadores)}</dd>
                    <dt>Municípios</dt>
                    <dd>{number(scopedState.totalMunicipios)}</dd>
                    <dt>Redes registradas (soma)</dt>
                    <dd>{number(scopedState.totalRedesRegistradas)}</dd>
                    <dt>IX registrados (soma)</dt>
                    <dd>{number(scopedState.totalIxRegistrados)}</dd>
                    <dt>Carriers (soma)</dt>
                    <dd>{number(scopedState.totalCarriersRegistrados)}</dd>
                    <dt>Com coordenadas</dt>
                    <dd>{number(scopedState.instalacoesComCoordenadas)}</dd>
                  </dl>
                </>
              )}
              <Link
                className="radar-state-link"
                to={`/radar/estado/${filters.uf}?${params.toString()}`}
              >
                Explorar estado
                <ArrowUpRight size={15} />
              </Link>
              <button
                className="radar-clear"
                onClick={() =>
                  document
                    .getElementById("radar-installations")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Ver instalações
                <ArrowLeft size={13} />
              </button>
            </Panel>
          )}
          <Panel
            title="Operadores"
            subtitle={
              metric === "networks"
                ? "Top 10 por soma de redes registradas"
                : "Top 10 por instalações"
            }
          >
            <QueryNotice query={operators} name="ranking de operadores" />
            <ol className="radar-ranking">
              {(operators.data ?? []).map((row, index) => (
                <li key={row.operador}>
                  <button onClick={() => update({ operator: row.operador })}>
                    <span className="radar-rank-number">{index + 1}</span>
                    <span>{displayValue(row.operador)}</span>
                    <strong>
                      {number(
                        metric === "networks"
                          ? row.totalRedesRegistradas
                          : row.totalInstalacoes,
                      )}
                    </strong>
                  </button>
                </li>
              ))}
            </ol>
            {operators.isSuccess && !operators.data.length && (
              <p className="radar-status">
                Sem operadores informados neste recorte.
              </p>
            )}
            {["ix", "carriers", "averageNetworks"].includes(metric) && (
              <p className="radar-method-note">
                O ranking de operadores permanece por instalações: a API não
                fornece esse indicador agregado por operador.
              </p>
            )}
          </Panel>
        </aside>
      </div>
      <div className="radar-charts">
        <RadarGeographicChart
          key={`${filters.uf}:${filters.region}:${filters.operator}:${filters.installationType}`}
          uf={filters.uf}
          metric={metric}
          states={stateRows}
          cities={cityRows}
          records={
            useImports
              ? importedModel.records(filters)
              : isolatedApi
                ? mapPoints
                : scopedTableRows.map((row) => ({
                    id: row.id,
                    unidade: row.nome,
                    operador: row.empresa,
                    municipio: row.cidade,
                    uf: stateKey(row.estado),
                    tipoInstalacao: row.tipoInstalacao,
                    latitude: pointById.get(row.id)?.latitude ?? null,
                    longitude: pointById.get(row.id)?.longitude ?? null,
                    precisaoGeo: pointById.get(row.id)?.precisaoGeo ?? null,
                    redesConectadas:
                      pointById.get(row.id)?.redesConectadas ?? null,
                    ixConectados: pointById.get(row.id)?.ixConectados ?? null,
                    carriers: pointById.get(row.id)?.carriers ?? null,
                  }))
          }
          query={filters.uf ? cities : states}
          recordsQuery={tableQuery}
          onState={chooseState}
          onOpen={openInstallation}
        />
        <Panel
          title="Conectividade registrada"
          subtitle={
            filters.uf ? `Municípios · ${scope}` : "Municípios · Brasil"
          }
        >
          <QueryNotice query={cities} name="conectividade por município" />
          <Bars
            key={`networks:${filters.uf}`}
            data={rankRadar(cities.data ?? [], "networks")
              .filter((row) => validNumber(row.totalRedesRegistradas))
              .slice(0, 10)
              .map((row) => ({
                name: `${row.municipio} / ${row.uf}`,
                value: row.totalRedesRegistradas!,
              }))}
            unit="redes registradas (soma)"
            color="#2563eb"
            horizontal
            animate
          />
          <p className="radar-method-note">
            Somente municípios com valores informados. Soma de registros não
            equivale a redes únicas.
          </p>
        </Panel>
      </div>
      {filters.uf && (
        <div id="radar-installations">
          <Panel
            title={`Instalações de ${scope}`}
            subtitle={
              isolatedApi && !useImports
                ? "Pontos do Radar · instalações com coordenadas"
                : "Cadastros do recorte · inclui instalações sem coordenadas"
            }
          >
            <QueryNotice query={tableQuery} name="instalações" />
            <div className="radar-table-tools">
              <label>
                <Search size={15} />
                <input
                  aria-label="Pesquisar instalações do Radar"
                  placeholder="Pesquisar unidade, operador ou município"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(0);
                  }}
                />
              </label>
              <div className="radar-sort-select">
                <FilterSelect
                  label="Ordenar instalações do Radar"
                  allowEmpty={false}
                  value={sort}
                  onChange={(value) => {
                    setSort(value);
                    setPage(0);
                  }}
                  options={[
                    { value: "name", label: "Unidade" },
                    { value: "operator", label: "Operador" },
                    { value: "city", label: "Município" },
                  ]}
                />
              </div>
            </div>
            <div className="radar-table-scroll">
              <table>
                <thead>
                  <tr>
                    {[
                      "Unidade",
                      "Operador",
                      "Município / UF",
                      "Tipo",
                      "Redes",
                      "IX",
                      "Carriers",
                      "Detalhes",
                    ].map((label) => (
                      <th key={label}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableRows
                    .slice(currentPage * 10, currentPage * 10 + 10)
                    .map((row) => {
                      const point = pointById.get(row.id);
                      return (
                        <tr key={row.id}>
                          <td>{displayValue(row.nome)}</td>
                          <td>{displayValue(row.empresa)}</td>
                          <td>
                            {displayValue(row.cidade)} /{" "}
                            {displayValue(row.estado)}
                          </td>
                          <td>{displayValue(row.tipoInstalacao)}</td>
                          <td>{number(point?.redesConectadas)}</td>
                          <td>{number(point?.ixConectados)}</td>
                          <td>{number(point?.carriers)}</td>
                          <td>
                            <button
                              aria-label={`Ver detalhes de ${row.nome}`}
                              onClick={() => openInstallation(row.id)}
                            >
                              <ArrowUpRight size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            {tableQuery.isSuccess && !tableRows.length && (
              <p className="radar-status">
                Nenhum Data Center encontrado para os filtros selecionados.
              </p>
            )}
            <div className="radar-pagination">
              <span>
                {tableRows.length} registros · página {currentPage + 1} de{" "}
                {Math.max(1, Math.ceil(tableRows.length / 10))}
              </span>
              <button
                disabled={currentPage === 0}
                onClick={() => setPage(currentPage - 1)}
              >
                Anterior
              </button>
              <button
                disabled={(currentPage + 1) * 10 >= tableRows.length}
                onClick={() => setPage(currentPage + 1)}
              >
                Próxima
              </button>
            </div>
            <p className="radar-method-note">
              {isolatedApi &&
                !useImports &&
                "A API do Radar retorna apenas instalações com coordenadas nesta tabela. Cadastros sem coordenadas continuam nos indicadores. "}
              {useImports
                ? "Conectividade informada no levantamento importado."
                : "Conectividade da tabela vem dos pontos georreferenciados do Radar."}
              Ausências aparecem como “Não informado”.
            </p>
          </Panel>
        </div>
      )}
      <Dialog
        open={!!selectedRadarPoint}
        onOpenChange={(open) => {
          if (!open) setSelectedRadarPoint(undefined);
        }}
        title={displayValue(selectedRadarPoint?.unidade)}
        description={`${displayValue(selectedRadarPoint?.municipio)} / ${displayValue(selectedRadarPoint?.uf)}`}
      >
        {selectedRadarPoint && (
          <dl className="radar-state-stats">
            {selectedRadarPoint.sourceId && (
              <>
                <dt>Identificador no levantamento</dt>
                <dd>{selectedRadarPoint.sourceId}</dd>
              </>
            )}
            <dt>Operador</dt>
            <dd>{displayValue(selectedRadarPoint.operador)}</dd>
            <dt>Tipo de instalação</dt>
            <dd>{displayValue(selectedRadarPoint.tipoInstalacao)}</dd>
            <dt>Redes registradas</dt>
            <dd>{number(selectedRadarPoint.redesConectadas)}</dd>
            <dt>IX registrados</dt>
            <dd>{number(selectedRadarPoint.ixConectados)}</dd>
            <dt>Carriers registrados</dt>
            <dd>{number(selectedRadarPoint.carriers)}</dd>
            <dt>Precisão geográfica</dt>
            <dd>{displayValue(selectedRadarPoint.precisaoGeo)}</dd>
            <dt>Latitude / longitude</dt>
            <dd>
              {number(selectedRadarPoint.latitude)} /{" "}
              {number(selectedRadarPoint.longitude)}
            </dd>
          </dl>
        )}
        {safeUrl(selectedRadarPoint?.sourceUrl ?? null) && (
          <a
            className="radar-state-link"
            target="_blank"
            rel="noreferrer"
            href={safeUrl(selectedRadarPoint?.sourceUrl ?? null)!}
          >
            Consultar fonte original
            <ArrowUpRight size={15} />
          </a>
        )}
      </Dialog>
      <footer className="radar-methodology">
        <Radio size={17} />
        <p>
          Os indicadores representam os registros disponíveis na base de dados
          do projeto e podem não abranger todas as instalações existentes no
          Brasil. Ausência de informação não representa zero. Limites estaduais:{" "}
          <a
            href="https://servicodados.ibge.gov.br/api/docs/malhas?versao=3"
            target="_blank"
            rel="noreferrer"
          >
            IBGE
          </a>
          .
        </p>
      </footer>
    </section>
  );
}
