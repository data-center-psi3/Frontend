import { lazy, Suspense, useEffect, useState } from "react";
import {
  HashRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { AppSidebar, Topbar, PageHeader } from "./components/layout/Shell";
import { navigation } from "./constants/navigation";
import { Button } from "./components/ui/button";
import { Card } from "./components/ui/card";
import { BrandMark } from "./components/ui/brand-mark";
import { FilterPanel, emptyFilters } from "./components/filters/FilterPanel";
import { ErrorState, LoadingState } from "./components/common";
const Dashboard = lazy(() =>
  import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })),
);
const Indicators = lazy(() =>
  import("./pages/Indicators").then((m) => ({ default: m.Indicators })),
);
const Comparison = lazy(() =>
  import("./pages/Comparison").then((m) => ({ default: m.Comparison })),
);
const MapPage = lazy(() =>
  import("./pages/Map").then((m) => ({ default: m.MapPage })),
);
const RadarPage = lazy(() =>
  import("./pages/Radar/RadarPage").then((m) => ({ default: m.RadarPage })),
);
const Benefits = lazy(() =>
  import("./pages/Content").then((m) => ({ default: m.Benefits })),
);
const Sources = lazy(() =>
  import("./pages/Content").then((m) => ({ default: m.Sources })),
);
const About = lazy(() =>
  import("./pages/Content").then((m) => ({ default: m.About })),
);
const Learning = lazy(() =>
  import("./pages/Learning").then((m) => ({ default: m.Learning })),
);
import { errorMessage, loadDataset } from "./services/api";
import { csv, filterCenters, filterIndicators } from "./utils/data";
import type { Connection, Dataset, Filters } from "./types/api";
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: 60000, refetchOnWindowFocus: false },
  },
});
const connection: Connection = { baseUrl: "/api", username: "", password: "" };
const blank: Dataset = {
  centers: [],
  indicators: [],
  sources: [],
  benefits: [],
  research: [],
  points: [],
  dashboard: [],
};

function AppContent() {
  const location = useLocation();
  const isLearning = location.pathname === "/por-dentro";
  const isRadar =
    location.pathname.startsWith("/radar") ||
    (location.pathname === "/mapa" &&
      new URLSearchParams(location.search).get("mode") === "radar");
  const navigate = useNavigate();
  const page = isRadar
    ? {
        title: "Radar de Concentração",
        description: "Distribuição da infraestrutura digital brasileira",
      }
    : (navigation.find((n) => n.path === location.pathname) ?? navigation[0]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState(
    () => localStorage.getItem("dc-theme") ?? "light",
  );
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("dc-theme", theme);
  }, [theme]);
  useEffect(() => {
    setSidebarOpen(false);
    document.title = `${page.title} · DataTerra`;
    const center = new URLSearchParams(location.search).get("center");
    if (new URLSearchParams(location.search).get("from") === "radar")
      setFilters(emptyFilters);
    else if (center) setFilters((f) => ({ ...f, center }));
  }, [location.pathname, location.search, page.title]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const query = useQuery({
    enabled: !isLearning && (!isRadar || location.pathname === "/mapa"),
    queryKey: ["dataset", "local", connection.baseUrl],
    queryFn: ({ signal }) => loadDataset(connection, signal),
  });
  const data = query.data ?? blank;
  const centers = filterCenters(data.centers, filters);
  const indicators = filterIndicators(
    data.indicators,
    centers,
    filters.period,
  ).filter((i) => !filters.indicator || i.tipo === filters.indicator);
  const props = { data, centers, indicators };
  function exportData() {
    const content = csv(
      indicators.map((i) => ({
        instalacao: data.centers.find((c) => c.id === i.dataCenterId)?.nome,
        indicador: i.tipo,
        valor: i.valor,
        unidade: i.unidade,
        periodo: i.periodo,
        fonte: data.sources.find((s) => s.id === i.fonteId)?.titulo,
        observacoes: i.observacoes,
        origem: "API local",
      })),
    );
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "dataterra-indicadores.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  async function ensureLocations() {
    await queryClient.fetchQuery({
      queryKey: ["dataset", "local", connection.baseUrl],
      queryFn: ({ signal }) => loadDataset(connection, signal),
      staleTime: Infinity,
    });
  }
  const ready = !!query.data;
  return (
    <>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Pular para o conteúdo
      </a>
      <div
        className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}
      >
        {sidebarOpen && (
          <button
            aria-label="Fechar navegação"
            className="sidebar-backdrop"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <AppSidebar
          open={sidebarOpen}
          collapsed={sidebarCollapsed}
          onCollapse={() => setSidebarCollapsed((v) => !v)}
          onNavigate={() => setSidebarOpen(false)}
          navigation={navigation}
        />
        <div className="workspace">
          <Topbar
            educational={isLearning}
            radar={isRadar}
            title={page.title}
            connected={!!query.data}
            failed={query.isError}
            theme={theme}
            onTheme={() => setTheme(theme === "light" ? "dark" : "light")}
            onMenu={() => setSidebarOpen(true)}
          />
          <main id="main-content" className="main-content" tabIndex={-1}>
            {!isLearning && !isRadar && (
              <PageHeader
                title={page.title}
                description={page.description}
                loading={query.isFetching}
                canExport={!!indicators.length}
                onRefresh={() => query.refetch()}
                onExport={exportData}
              />
            )}
            {ready &&
              !isRadar &&
              !["/fontes", "/sobre", "/por-dentro"].includes(
                location.pathname,
              ) && (
                <FilterPanel
                  data={data}
                  filters={filters}
                  onChange={setFilters}
                />
              )}
            <div className="page-content">
              <Suspense fallback={<LoadingState />}>
                {isLearning ? (
                  <Learning />
                ) : !isRadar && query.isPending ? (
                  <LoadingState />
                ) : !isRadar && query.isError && !query.data ? (
                  <ErrorState
                    message={errorMessage(query.error)}
                    onRetry={() => query.refetch()}
                  />
                ) : (
                  <Routes>
                    <Route
                      path="/radar"
                      element={<RadarPage connection={connection} />}
                    />
                    <Route
                      path="/radar/estado/:uf"
                      element={<RadarPage connection={connection} />}
                    />
                    <Route path="/" element={<Dashboard {...props} />} />
                    <Route
                      path="/dashboard"
                      element={<Dashboard {...props} />}
                    />
                    <Route
                      path="/indicadores"
                      element={<Indicators {...props} />}
                    />
                    <Route
                      path="/mapa"
                      element={
                        <MapPage
                          {...props}
                          mode="real"
                          connection={connection}
                          connectionVersion={0}
                          ensureLocations={ensureLocations}
                        />
                      }
                    />
                    <Route
                      path="/comparacao"
                      element={<Comparison {...props} />}
                    />
                    <Route
                      path="/beneficios"
                      element={<Benefits {...props} />}
                    />
                    <Route path="/fontes" element={<Sources {...props} />} />
                    <Route path="/sobre" element={<About {...props} />} />
                    <Route
                      path="*"
                      element={
                        <Card className="connection-state">
                          <h2>Página não encontrada</h2>
                          <Button onClick={() => navigate("/")}>
                            Ir para a visão geral
                          </Button>
                        </Card>
                      }
                    />
                  </Routes>
                )}
              </Suspense>
            </div>
            <footer className="app-footer">
              <span className="footer-brand">
                <BrandMark size={18} /> DataTerra · Tecnologia com perspectiva
                ambiental.
              </span>
              <span>Instituto Federal de São Paulo · Campus Hortolândia</span>
              <a
                href={
                  import.meta.env.VITE_LANDING_URL || "http://localhost:5174"
                }
              >
                Conheça a DataTerra
              </a>
            </footer>
          </main>
        </div>
      </div>
    </>
  );
}
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <AppContent />
      </HashRouter>
    </QueryClientProvider>
  );
}
