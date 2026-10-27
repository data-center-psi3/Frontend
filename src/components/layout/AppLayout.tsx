import { Suspense, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppSidebar, Topbar, PageHeader } from "./Shell";
import { navigation } from "../../constants/navigation";
import { BrandMark } from "../ui/brand-mark";
import { FilterPanel } from "../filters/FilterPanel";
import { ErrorState, LoadingState } from "../common";
import { errorMessage } from "../../services/http/errors";
import { useAppData } from "../../hooks/useAppData";
import type { AppOutletContext } from "../../types/routes";

export function AppLayout() {
  const location = useLocation();
  const isNews = location.pathname === "/noticias";
  const isAgent = location.pathname === "/assistente";
  const isLearning = location.pathname === "/por-dentro";
  const isRadar =
    location.pathname.startsWith("/radar") ||
    (location.pathname === "/mapa" &&
      new URLSearchParams(location.search).get("mode") === "radar");
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
  }, [location.pathname, location.search, page.title]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const {
    query,
    data,
    centers,
    indicators,
    filters,
    setFilters,
    exportData,
    ensureLocations,
  } = useAppData(
    isLearning || isAgent,
    isRadar,
    location.pathname,
    location.search,
  );
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
            educational={isLearning || isAgent}
            radar={isRadar}
            news={isNews}
            title={page.title}
            connected={!!query.data}
            failed={query.isError}
            theme={theme}
            onTheme={() => setTheme(theme === "light" ? "dark" : "light")}
            onMenu={() => setSidebarOpen(true)}
          />
          <main id="main-content" className="main-content" tabIndex={-1}>
            {!isNews && !isLearning && !isRadar && !isAgent && (
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
              ![
                "/fontes",
                "/sobre",
                "/por-dentro",
                "/noticias",
                "/assistente",
              ].includes(location.pathname) && (
                <FilterPanel
                  data={data}
                  filters={filters}
                  onChange={setFilters}
                />
              )}
            <div className="page-content">
              <Suspense fallback={<LoadingState />}>
                {!isNews &&
                !isLearning &&
                !isRadar &&
                !isAgent &&
                query.isPending ? (
                  <LoadingState />
                ) : !isNews &&
                  !isLearning &&
                  !isAgent &&
                  !isRadar &&
                  query.isError &&
                  !query.data ? (
                  <ErrorState
                    message={errorMessage(query.error)}
                    onRetry={() => query.refetch()}
                  />
                ) : (
                  <Outlet
                    context={
                      {
                        data,
                        centers,
                        indicators,
                        ensureLocations,
                      } satisfies AppOutletContext
                    }
                  />
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
