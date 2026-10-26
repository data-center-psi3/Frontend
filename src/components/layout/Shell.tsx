import { NavLink } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ChevronRight,
  Download,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { Button } from "../ui/button";
import { InstitutionMark } from "../ui/institution-mark";
import { BrandMark } from "../ui/brand-mark";
export interface NavigationItem {
  path: string;
  title: string;
  description: string;
  icon: LucideIcon;
}
export function AppSidebar({
  open,
  collapsed,
  onCollapse,
  onNavigate,
  navigation,
}: {
  open: boolean;
  collapsed: boolean;
  onCollapse: () => void;
  onNavigate: () => void;
  navigation: NavigationItem[];
}) {
  const sidebar = useRef<HTMLElement>(null);
  const [mobile, setMobile] = useState(
    () => window.matchMedia?.("(max-width: 768px)").matches ?? false,
  );
  useEffect(() => {
    if (!window.matchMedia) return;
    const media = window.matchMedia("(max-width: 768px)");
    const update = () => setMobile(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (open && mobile)
      sidebar.current?.querySelector<HTMLAnchorElement>("nav a")?.focus();
  }, [open, mobile]);
  return (
    <aside
      ref={sidebar}
      aria-hidden={mobile && !open ? true : undefined}
      {...(mobile && !open ? { inert: "" } : {})}
      onKeyDown={(event) => {
        if (!mobile || !open) return;
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onNavigate();
          document
            .querySelector<HTMLButtonElement>('[aria-label="Abrir navegação"]')
            ?.focus();
        }
        if (event.key === "Tab") {
          const items = [
            ...event.currentTarget.querySelectorAll<HTMLElement>(
              "a[href],button:not([disabled])",
            ),
          ].filter((e) => e.getClientRects().length);
          const first = items[0],
            last = items.at(-1);
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }
      }}
      className={`sidebar ${open ? "is-open" : ""}`}
      aria-label="Navegação da plataforma"
    >
      <NavLink
        to="/"
        onClick={onNavigate}
        className="brand"
        aria-label="DataTerra — Visão geral"
      >
        <span className="brand-mark">
          <BrandMark />
        </span>
        <span className="brand-wordmark">
          <span className="brand-name">
            Data<span>Terra</span>
            <i aria-hidden="true" />
          </span>
          <small>INTELIGÊNCIA AMBIENTAL</small>
        </span>
      </NavLink>
      <div className="sidebar-group-label">ANÁLISE</div>
      <nav aria-label="Navegação principal">
        {navigation.slice(0, 5).map((n) => (
          <NavLink
            key={n.path}
            end={n.path === "/"}
            to={n.path}
            onClick={onNavigate}
            aria-label={n.title}
            title={collapsed ? n.title : undefined}
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <n.icon size={19} />
            <span>{n.title}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-group-label secondary-label">
        PROJETO & REFERÊNCIAS
      </div>
      <nav aria-label="Informações do projeto">
        {navigation.slice(5).map((n) => (
          <NavLink
            key={n.path}
            to={n.path}
            onClick={onNavigate}
            aria-label={n.title}
            title={collapsed ? n.title : undefined}
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <n.icon size={19} />
            <span>{n.title}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <NavLink
          className="sidebar-transparency"
          to="/fontes"
          onClick={onNavigate}
        >
          <span className="transparency-dot" />
          <span>
            Ciência com transparência<small>Consulte as fontes dos dados</small>
          </span>
          <ArrowUpRight size={15} />
        </NavLink>
        <div className="institution">
          <InstitutionMark />
          <span>
            Instituto Federal<small>Campus Hortolândia</small>
          </span>
        </div>
        <Button
          variant="ghost"
          className="collapse-button"
          onClick={onCollapse}
          aria-label={collapsed ? "Expandir navegação" : "Recolher navegação"}
        >
          {collapsed ? (
            <PanelLeftOpen size={18} />
          ) : (
            <PanelLeftClose size={18} />
          )}
          <span>Recolher navegação</span>
        </Button>
      </div>
    </aside>
  );
}
export function Topbar({
  educational = false,
  radar = false,
  news = false,
  title,
  connected,
  failed,
  theme,
  onTheme,
  onMenu,
}: {
  educational?: boolean;
  radar?: boolean;
  news?: boolean;
  title: string;
  connected: boolean;
  failed: boolean;
  theme: string;
  onTheme: () => void;
  onMenu: () => void;
}) {
  return (
    <header className="app-header">
      <div className="breadcrumbs">
        <Button
          variant="ghost"
          className="mobile-menu icon-button"
          aria-label="Abrir navegação"
          onClick={onMenu}
        >
          <Menu size={20} />
        </Button>
        <span>Workspace</span>
        <ChevronRight size={14} />
        <strong>{title}</strong>
      </div>
      <div className="header-actions">
        <span
          className={`connection-badge ${radar || news ? "" : educational || (connected && !failed) ? "online" : failed ? "offline" : ""}`}
        >
          <i />
          {news
            ? "Feed de notícias"
            : radar
              ? "Radar de concentração"
              : educational
                ? "Modo educativo"
                : failed
                  ? "API local indisponível"
                  : connected
                    ? "API local conectada"
                    : "Carregando API local…"}
        </span>
        <span className="header-divider" />
        <Button
          variant="ghost"
          className="icon-button"
          aria-label={
            theme === "light" ? "Ativar tema escuro" : "Ativar tema claro"
          }
          onClick={onTheme}
        >
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </Button>
      </div>
    </header>
  );
}
export function PageHeader({
  title,
  description,
  loading,
  canExport,
  onRefresh,
  onExport,
}: {
  title: string;
  description: string;
  loading: boolean;
  canExport: boolean;
  onRefresh: () => void;
  onExport: () => void;
}) {
  return (
    <div className="page-header">
      <div>
        <span className="eyebrow">DATA CENTERS & SUSTENTABILIDADE</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="page-actions">
        <Button
          variant="outline"
          aria-label="Atualizar dados"
          disabled={loading}
          onClick={onRefresh}
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          <span>Atualizar</span>
        </Button>
        <Button disabled={!canExport} onClick={onExport}>
          <Download size={16} />
          <span>Exportar dados</span>
        </Button>
      </div>
    </div>
  );
}
