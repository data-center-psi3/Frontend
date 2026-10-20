import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "./ui/card";
import { InfoTooltip } from "./ui/tooltip";
import { SourceReference } from "./common";
import type { DataCenter, Indicator, Source } from "../types/api";
import { number, displayValue } from "../utils/data";
export function EnvironmentalMetricCard({
  label,
  category,
  icon: Icon,
  description,
  record,
  relatedCount,
  center,
  source,
}: {
  label: string;
  category: string;
  icon: LucideIcon;
  description: string;
  record?: Indicator;
  relatedCount: number;
  center?: DataCenter;
  source?: Source;
}) {
  return (
    <Card className={`environmental-metric semantic-${category}`}>
      <div className="environmental-metric-heading">
        <span className={`icon-box metric-gradient ${category}`}>
          <Icon size={18} />
        </span>
        <h2>{label}</h2>
        <InfoTooltip text={description} />
      </div>
      <div className={`environmental-value ${!record ? "unavailable" : ""}`}>
        {record ? (
          number(record.valor)
        ) : (
          <span className="metric-missing">
            <i />
            Não informado
          </span>
        )}
        {record && <span>{displayValue(record.unidade)}</span>}
      </div>
      <p className="metric-period">
        {record
          ? `Período: ${displayValue(record.periodo)}`
          : "Sem valor quantitativo na seleção"}
      </p>
      {record ? (
        <div className="metric-record">
          <span>Registro de referência</span>
          <strong title={center?.nome}>
            {center?.nome ?? `Instalação ${record.dataCenterId}`}
          </strong>
          <SourceReference source={source} />
        </div>
      ) : (
        <div
          className={`metric-availability ${relatedCount ? "has-evidence" : ""}`}
        >
          <span>
            {relatedCount
              ? `${relatedCount} evidências relacionadas`
              : "Sem evidências nesta seleção"}
          </span>
        </div>
      )}
      <Link
        className="metric-detail-link"
        to={`/indicadores?category=${category}`}
      >
        Explorar evidências
        <ArrowUpRight size={15} />
      </Link>
    </Card>
  );
}
