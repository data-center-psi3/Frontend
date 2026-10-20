import {
  ArrowUpRight,
  Database,
  RefreshCw,
  AlertCircle,
  Search,
} from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { InfoTooltip } from "./ui/tooltip";
import type { ReactNode } from "react";
import type { Source } from "../types/api";
import { date, safeUrl, displayValue } from "../utils/data";
export function Panel({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={`panel ${className}`}>
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}
export function EmptyState({
  title = "Nenhum registro encontrado",
  description = "Experimente alterar os filtros ou consulte a disponibilidade dos dados.",
  compact = false,
}: {
  title?: string;
  description?: string;
  compact?: boolean;
}) {
  return (
    <div className={`empty-state ${compact ? "compact" : ""}`}>
      <Search size={24} />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
export function LoadingState() {
  return (
    <div role="status" aria-label="Carregando dados" className="loading-grid">
      {Array.from({ length: 6 }, (_, i) => (
        <Card className="skeleton-card" key={i}>
          <div className="skeleton w-2/5 h-4" />
          <div className="skeleton w-3/5 h-10 mt-6" />
          <div className="skeleton w-full h-4 mt-6" />
        </Card>
      ))}
    </div>
  );
}
export function ErrorState({
  message,
  onRetry,
  onConfigure,
}: {
  message: string;
  onRetry: () => void;
  onConfigure?: () => void;
}) {
  return (
    <Card className="connection-state" role="alert">
      <AlertCircle size={30} />
      <h2>Não foi possível carregar os dados</h2>
      <p>{message}</p>
      <div>
        <Button onClick={onRetry}>
          <RefreshCw size={15} />
          Tentar novamente
        </Button>
        {onConfigure && (
          <Button variant="outline" onClick={onConfigure}>
            Configurar conexão
          </Button>
        )}
      </div>
    </Card>
  );
}
export function SourceReference({ source }: { source?: Source }) {
  if (!source)
    return <span className="text-xs text-muted-foreground">Não informado</span>;
  const url = safeUrl(source.url);
  return url ? (
    <a
      className="source-link"
      href={url}
      title={displayValue(source.titulo)}
      aria-label={`${displayValue(source.instituicao)}: ${displayValue(source.titulo)}`}
      target="_blank"
      rel="noopener noreferrer"
    >
      {displayValue(source.instituicao)}
      <ArrowUpRight size={13} />
    </a>
  ) : (
    <span className="source-link">{displayValue(source.instituicao)}</span>
  );
}
export function SourceCard({
  source,
  count,
}: {
  source: Source;
  count: number;
}) {
  const url = safeUrl(source.url);
  return (
    <Card className="source-card">
      <div className="source-top">
        <div className="icon-box blue">
          <Database size={19} />
        </div>
        <span>{count} indicadores associados</span>
      </div>
      <h3>{displayValue(source.titulo)}</h3>
      <p>{displayValue(source.instituicao)}</p>
      <div className="source-dates">
        <span>Publicação: {date(source.dataPublicacao)}</span>
        <span>Consulta: {date(source.dataConsulta)}</span>
      </div>
      {url ? (
        <a
          className="source-link"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Consultar documento original
          <ArrowUpRight size={15} />
        </a>
      ) : (
        <span className="text-xs text-muted-foreground">
          URL original não disponível
        </span>
      )}
    </Card>
  );
}
export function MetricCard({
  label,
  value,
  unit,
  caption,
  explanation,
  icon,
  onClick,
  color = "green",
}: {
  label: string;
  value: string;
  unit?: string;
  caption: string;
  explanation: string;
  icon: ReactNode;
  onClick: () => void;
  color?: string;
}) {
  return (
    <Card className="metric-card">
      <div className="metric-top">
        <span>{label}</span>
        <div className={`icon-box ${color}`}>{icon}</div>
      </div>
      <div className="metric-value">
        {value}
        <small>{unit}</small>
      </div>
      <div className="metric-bottom">
        <span>{caption}</span>
        <InfoTooltip text={explanation} />
        <button aria-label={`Ver detalhes de ${label}`} onClick={onClick}>
          <ArrowUpRight size={17} />
        </button>
      </div>
    </Card>
  );
}
