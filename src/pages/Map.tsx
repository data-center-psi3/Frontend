import {
  lazy,
  Suspense,
  useMemo,
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
} from "react";
import "../components/maps/territory.css";
import { Link, useSearchParams } from "react-router-dom";
import {
  MapPin,
  Search,
  ChevronRight,
  BookOpen,
  Zap,
  Droplets,
  Leaf,
  ArrowUpRight,
  LocateFixed,
  Building2,
  Check,
  LoaderCircle,
} from "lucide-react";
import { Panel } from "../components/common";
import { BrandMark } from "../components/ui/brand-mark";
import { DataCentersTable } from "../components/DataCentersTable";
import { DataCenterMap, validPoint } from "../components/maps/DataCenterMap";
import { MapModeToggle } from "../components/maps/MapModeToggle";
import { DataCenterDetails } from "../components/maps/DataCenterDetails";
import { displayValue, normalize } from "../utils/data";
import { geographicGroups } from "../utils/geography";
import type { ViewProps } from "./Dashboard";
import type { Connection } from "../types/api";

const loadRadar = () => import("./Radar/RadarPage");
const RadarPage = lazy(() =>
  loadRadar().then((m) => ({ default: m.RadarPage })),
);

const topics = [
  {
    name: "Energia",
    icon: Zap,
    unit: "MWh",
    description: "Consumo, potência e eficiência pedem leituras diferentes.",
    explanation:
      "Energia consumida em um período. MW, por sua vez, expressa potência.",
  },
  {
    name: "Água",
    icon: Droplets,
    unit: "m³",
    description: "O uso de água também faz parte da infraestrutura digital.",
    explanation:
      "Volume de água consumido. Confira o período e os limites de cada levantamento.",
  },
  {
    name: "Emissões",
    icon: Leaf,
    unit: "tCO₂e",
    description: "Uma perspectiva sobre a pegada de carbono das instalações.",
    explanation:
      "Toneladas de dióxido de carbono equivalente. Compare o escopo e o método de cálculo.",
  },
] as const;
const investigation = {
  Unidade:
    "Grandezas diferentes não devem ser somadas. Confira sempre a unidade.",
  Período:
    "Compare dados de períodos equivalentes e observe a data de cada registro.",
  Fonte:
    "Consulte a referência original e os limites da informação antes de comparar.",
};

export function MapPage({
  data,
  centers,
  mode,
  connection,
  connectionVersion,
  ensureLocations,
}: ViewProps & {
  mode: string;
  connection: Connection | null;
  connectionVersion: number;
  ensureLocations?: () => Promise<unknown>;
}) {
  const [params, setParams] = useSearchParams();
  const radarOpen = params.get("mode") === "radar";
  const [radarVisited, setRadarVisited] = useState(radarOpen);
  const [switching, setSwitching] = useState<"locations" | "radar">();
  const [switchError, setSwitchError] = useState<string>();
  const modeContainer = useRef<HTMLDivElement>(null);
  const mapAnchor = useRef<number | null>(null);
  useEffect(() => {
    if (radarOpen) setRadarVisited(true);
  }, [radarOpen]);
  function rememberPosition() {
    const canvas = modeContainer.current?.querySelector(
      radarOpen ? ".radar-map-canvas" : ".territory-map",
    );
    mapAnchor.current = canvas?.getBoundingClientRect().top ?? null;
  }
  const restorePosition = useCallback(() => {
    if (mapAnchor.current === null) return;
    const canvas = modeContainer.current?.querySelector(
      radarOpen ? ".radar-map-canvas" : ".territory-map",
    );
    if (!canvas) return;
    const offset = canvas.getBoundingClientRect().top - mapAnchor.current;
    mapAnchor.current = null;
    if (Math.abs(offset) > 1)
      window.scrollBy({ top: offset, behavior: "instant" });
    canvas
      .closest(".map-mode-stage")
      ?.querySelector<HTMLButtonElement>(
        '.map-mode-toggle button[aria-pressed="true"]',
      )
      ?.focus({ preventScroll: true });
  }, [radarOpen]);
  useLayoutEffect(restorePosition, [restorePosition]);
  async function openRadar() {
    if (switching) return;
    setSwitching("radar");
    setSwitchError(undefined);
    try {
      await loadRadar();
      rememberPosition();
      setRadarVisited(true);
      const next = new URLSearchParams(params);
      next.set("mode", "radar");
      if (!next.has("view")) next.set("view", "heat");
      if (!next.has("metric")) next.set("metric", "installations");
      setParams(next);
    } catch {
      setSwitchError(
        "Não foi possível abrir o mapa de calor. Tente novamente pelo botão.",
      );
    } finally {
      setSwitching(undefined);
    }
  }
  async function closeRadar(id?: number) {
    if (switching) return;
    setSwitching("locations");
    setSwitchError(undefined);
    try {
      await ensureLocations?.();
      rememberPosition();
      const next = new URLSearchParams(params);
      next.delete("mode");
      if (id !== undefined) {
        next.set("selected", String(id));
        next.set("from", "radar");
        setCity(undefined);
        setSelectedState(undefined);
        setSelected(id);
      }
      setParams(next);
    } catch {
      setSwitchError(
        "Não foi possível carregar as localizações. O Radar continua disponível; tente novamente pelo pin.",
      );
    } finally {
      setSwitching(undefined);
    }
  }
  const [selected, setSelected] = useState<number | undefined>(
    Number(params.get("selected")) || undefined,
  );
  const [city, setCity] = useState<string>();
  const [selectedState, setSelectedState] = useState<string>();
  const [expandedStates, setExpandedStates] = useState<Set<string>>(new Set());
  const [overviewKey, setOverviewKey] = useState(0);
  const [search, setSearch] = useState("");
  const [topicIndex, setTopicIndex] = useState(0);
  const [investigate, setInvestigate] =
    useState<keyof typeof investigation>("Unidade");
  const ids = useMemo(() => new Set(centers.map((c) => c.id)), [centers]);
  const points = useMemo(
    () => data.points.filter((p) => ids.has(p.id) && validPoint(p)),
    [data.points, ids],
  );
  const states = useMemo(() => geographicGroups(points), [points]);
  const cities = useMemo(
    () => states.flatMap((state) => state.cities),
    [states],
  );
  const activeCity = cities.find((c) => c.key === city);
  const activeState = states.find((state) => state.key === selectedState);
  const visiblePoints = useMemo(
    () =>
      activeCity
        ? activeCity.records
        : activeState
          ? activeState.cities.flatMap((c) => c.records)
          : points,
    [points, activeCity, activeState],
  );
  const active =
    selected &&
    (visiblePoints.some((p) => p.id === selected) ||
      (params.get("from") === "radar" &&
        centers.some((center) => center.id === selected)))
      ? selected
      : undefined;
  const selectedPoint =
    points.find((p) => p.id === active) ??
    (params.get("from") === "radar"
      ? centers.find((center) => center.id === active)
      : undefined);
  const topic = topics[topicIndex];
  const TopicIcon = topic.icon;
  function chooseCity(key?: string) {
    setCity(key);
    setSelectedState(undefined);
    setSelected(undefined);
    if (!key) setOverviewKey((value) => value + 1);
  }
  function toggleState(key: string) {
    setExpandedStates((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }
  function chooseState(key: string) {
    setSelectedState(key);
    setCity(undefined);
    setSelected(undefined);
    setExpandedStates((previous) => new Set(previous).add(key));
  }
  return (
    <div className="map-mode-container" ref={modeContainer}>
      {(switching || switchError) && (
        <div
          className="map-mode-notice"
          role={switchError ? "alert" : "status"}
        >
          {switching && <LoaderCircle size={15} className="animate-spin" />}
          {switchError ??
            (switching === "locations"
              ? "Preparando localizações…"
              : "Preparando mapa de calor…")}
        </div>
      )}
      {(radarOpen || radarVisited) && connection && (
        <div
          className={`map-mode-stage ${radarOpen ? "is-active" : "is-suspended"}`}
          {...(!radarOpen ? { inert: "" } : {})}
          aria-hidden={!radarOpen || undefined}
        >
          <Suspense fallback={null}>
            <RadarPage
              connection={connection}
              onClose={() => closeRadar()}
              onOpenInstallation={closeRadar}
              onViewReady={restorePosition}
            />
          </Suspense>
        </div>
      )}
      <div
        className={`location-mode map-mode-stage ${radarOpen ? "is-suspended" : "is-active"}`}
        {...(radarOpen ? { inert: "" } : {})}
        aria-hidden={radarOpen || undefined}
      >
        <section
          className="territory-explorer"
          data-point-count={points.length}
          aria-label="Explorar data centers no território"
        >
          <aside className="territory-cities" aria-label="Cidades no mapa">
            <div className="territory-brand">
              <BrandMark size={36} />
              <p>
                Seu próximo
                <br />
                <span>ponto de vista.</span>
              </p>
            </div>
            <label className="territory-eyebrow" htmlFor="city-search">
              Explore uma cidade
            </label>
            <div className="territory-search">
              <Search size={16} />
              <input
                id="city-search"
                placeholder="Pesquisar cidade"
                value={search}
                onChange={(e) => {
                  const value = e.target.value;
                  setSearch(value);
                  if (value)
                    setExpandedStates(
                      new Set(
                        states
                          .filter(
                            (state) =>
                              normalize(`${state.name} ${state.key}`).includes(
                                normalize(value),
                              ) ||
                              state.cities.some((c) =>
                                normalize(c.name).includes(normalize(value)),
                              ),
                          )
                          .map((state) => state.key),
                      ),
                    );
                }}
                type="search"
              />
            </div>
            <div className="territory-city-list">
              <button
                className={`territory-city ${!activeCity && !activeState ? "is-active" : ""}`}
                aria-pressed={!activeCity && !activeState}
                onClick={() => chooseCity()}
              >
                <MapPin size={18} />
                <span>
                  Todo o território
                  <small>
                    {points.length} instalações · {cities.length} cidades
                  </small>
                </span>
                <ChevronRight size={15} />
              </button>
              {states
                .filter(
                  (state) =>
                    normalize(`${state.name} ${state.key}`).includes(
                      normalize(search),
                    ) ||
                    state.cities.some((c) =>
                      normalize(c.name).includes(normalize(search)),
                    ),
                )
                .map((state) => {
                  const isExpanded = expandedStates.has(state.key);
                  const childrenId = `state-cities-${encodeURIComponent(state.key)}`;
                  return (
                    <div className="territory-state-group" key={state.key}>
                      <div
                        className={`territory-state-row ${activeState?.key === state.key ? "is-active" : ""}`}
                      >
                        <button
                          className="territory-state-select"
                          aria-pressed={activeState?.key === state.key}
                          onClick={() => chooseState(state.key)}
                        >
                          <MapPin size={18} />
                          <span>
                            {state.name}
                            <small>
                              {state.key || "Estado não informado"} ·{" "}
                              {state.count} instalações
                            </small>
                          </span>
                        </button>
                        <button
                          className="territory-state-toggle"
                          aria-label={`${isExpanded ? "Recolher" : "Expandir"} cidades de ${state.name}`}
                          aria-expanded={isExpanded}
                          aria-controls={childrenId}
                          onClick={() => toggleState(state.key)}
                        >
                          <ChevronRight size={17} />
                        </button>
                      </div>
                      {isExpanded && (
                        <div
                          id={childrenId}
                          className="territory-state-children"
                        >
                          {state.cities
                            .filter(
                              (c) =>
                                normalize(
                                  `${state.name} ${state.key}`,
                                ).includes(normalize(search)) ||
                                normalize(c.name).includes(normalize(search)),
                            )
                            .map((c) => (
                              <button
                                key={c.key}
                                className={`territory-city territory-child ${activeCity?.key === c.key ? "is-active" : ""}`}
                                aria-pressed={activeCity?.key === c.key}
                                onClick={() => chooseCity(c.key)}
                              >
                                <MapPin size={18} />
                                <span>
                                  {c.name}
                                  <small>
                                    {c.state} · {c.count}{" "}
                                    {c.count === 1
                                      ? "instalação"
                                      : "instalações"}
                                  </small>
                                </span>
                                <ChevronRight size={15} />
                              </button>
                            ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              {!!search &&
                !cities.some((c) =>
                  normalize(
                    `${c.name} ${c.state} ${states.find((state) => state.key === c.state)?.name}`,
                  ).includes(normalize(search)),
                ) && (
                  <p className="territory-no-results" role="status">
                    Nenhuma cidade encontrada.
                  </p>
                )}
            </div>
            <p className="territory-note">
              <BookOpen size={19} />
              <span>
                O contexto faz
                <br />
                parte do dado.
              </span>
            </p>
          </aside>
          <div className="territory-main">
            <header className="territory-heading">
              <div>
                <span className="territory-eyebrow">
                  Tecnologia encontra território
                </span>
                <h2>Conecte os pontos.</h2>
              </div>
              <div className="territory-map-actions">
                <button
                  className="territory-overview"
                  aria-label="Ver todo o território"
                  title="Ver todo o território"
                  onClick={() => chooseCity()}
                >
                  <LocateFixed size={19} />
                </button>
                <MapModeToggle mode="locations" onChange={openRadar} />
              </div>
            </header>
            <div className="territory-map">
              <DataCenterMap
                points={visiblePoints}
                overviewKey={overviewKey}
                selected={active}
                onSelect={setSelected}
              />
            </div>
            <div className="territory-topics" aria-label="Contexto ambiental">
              {topics.map((t, index) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.name}
                    aria-pressed={topicIndex === index}
                    className={topicIndex === index ? "is-active" : ""}
                    onClick={() => {
                      setTopicIndex(index);
                      setSelected(undefined);
                    }}
                  >
                    <Icon size={17} />
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>
          <aside
            className="territory-context"
            aria-label="Contexto da localização"
          >
            <span className="territory-eyebrow">Localização em foco</span>
            <h2>
              {selectedPoint
                ? displayValue(selectedPoint.cidade)
                : (activeCity?.name ?? activeState?.name ?? "Brasil")}
            </h2>
            <p className="territory-location">
              {selectedPoint
                ? displayValue(selectedPoint.estado)
                : (activeCity?.state ??
                  (activeState
                    ? `${activeState.cities.length} cidades · ${activeState.key}`
                    : undefined) ??
                  `${cities.length} cidades no levantamento`)}
            </p>
            {active ? (
              <DataCenterDetails
                id={active}
                data={data}
                mode={mode}
                connection={connection}
                connectionVersion={connectionVersion}
                onClose={() => setSelected(undefined)}
              />
            ) : (
              <>
                <div className={`territory-topic-icon topic-${topicIndex}`}>
                  <TopicIcon size={25} />
                </div>
                <h3>{topic.name}</h3>
                <p className="territory-description">{topic.description}</p>
                <div className="territory-measure">
                  <span className="territory-eyebrow">Entenda a medida</span>
                  <strong>{topic.unit}</strong>
                  <p>{topic.explanation}</p>
                </div>
                <span className="territory-eyebrow">O que investigar</span>
                <div className="territory-investigation">
                  {(
                    Object.keys(investigation) as (keyof typeof investigation)[]
                  ).map((key) => (
                    <button
                      key={key}
                      aria-pressed={investigate === key}
                      onClick={() => setInvestigate(key)}
                    >
                      {key}
                    </button>
                  ))}
                </div>
                <p className="territory-advice">{investigation[investigate]}</p>
                {activeCity && (
                  <div className="territory-installations">
                    <span className="territory-eyebrow">
                      Instalações na cidade
                    </span>
                    {visiblePoints.map((p) => (
                      <button key={p.id} onClick={() => setSelected(p.id)}>
                        <Building2 size={15} />
                        <span>{displayValue(p.nome)}</span>
                        <ChevronRight size={14} />
                      </button>
                    ))}
                  </div>
                )}
                <Link className="territory-link" to="/indicadores">
                  Explorar indicadores
                  <ArrowUpRight size={17} />
                </Link>
              </>
            )}
          </aside>
          <footer className="territory-status">
            <span>
              <Check size={14} />
              Explore, selecione e descubra
            </span>
            <span>
              {centers.length - points.length} cadastros sem coordenadas
              disponíveis
            </span>
          </footer>
        </section>
        <Panel
          title="Tabela de data centers"
          subtitle="Dados completos do levantamento · inclui registros sem coordenadas"
        >
          <DataCentersTable connection={connection} />
        </Panel>
      </div>
    </div>
  );
}
