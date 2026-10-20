import { useQuery } from "@tanstack/react-query";
import { MapPin, Building2, X, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { SourceReference, EmptyState } from "../common";
import type { Connection, Dataset } from "../../types/api";
import { loadDetails, errorMessage } from "../../services/api";
import { number, displayValue } from "../../utils/data";
export function DataCenterDetails({
  id,
  data,
  mode,
  connection,
  onClose,
  connectionVersion,
}: {
  id: number;
  data: Dataset;
  mode: string;
  connection: Connection | null;
  connectionVersion: number;
  onClose: () => void;
}) {
  const query = useQuery({
    queryKey: ["detail", mode, connectionVersion, id],
    queryFn: ({ signal }) => loadDetails(connection!, id, signal),
    enabled: mode === "real" && !!connection,
  });
  const center =
    mode === "demo"
      ? data.centers.find((c) => c.id === id)
      : query.data?.center;
  const indicators = data.indicators.filter((i) => i.dataCenterId === id);
  const benefits = data.benefits.filter((i) => i.dataCenterId === id);
  const relatedIds = new Set(
    [
      ...indicators,
      ...benefits,
      ...data.research.filter((r) => r.dataCenterId === id),
    ].map((i) => i.fonteId),
  );
  const sources = [
    ...(query.data?.sources ?? []),
    ...data.sources.filter((s) => relatedIds.has(s.id)),
  ].filter((s, i, a) => a.findIndex((v) => v.id === s.id) === i);
  return (
    <aside className="details-panel" aria-label="Detalhes do data center">
      <div className="details-title">
        <span>INSTALAÇÃO SELECIONADA</span>
        <Button
          variant="ghost"
          className="icon-button"
          aria-label="Fechar detalhes"
          onClick={onClose}
        >
          <X size={17} />
        </Button>
      </div>
      {query.isLoading ? (
        <p role="status">Carregando detalhes...</p>
      ) : query.isError ? (
        <div role="alert">
          <p>{errorMessage(query.error)}</p>
          <Button variant="outline" onClick={() => query.refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : center ? (
        <>
          <div className="icon-box purple large">
            <Building2 size={26} />
          </div>
          <h2>{displayValue(center.nome)}</h2>
          <p className="location-line">
            <MapPin size={14} />
            {displayValue(center.cidade)}, {displayValue(center.estado)} ·{" "}
            {displayValue(center.pais)}
          </p>
          <Badge variant="secondary">
            {displayValue(center.statusValidacao)}
          </Badge>
          <p className="details-description">
            {displayValue(center.descricao)}
          </p>
          <div className="details-stats">
            <div>
              <span>Potência declarada</span>
              <strong>
                {number(center.potenciaMw)}{" "}
                {center.potenciaMw != null ? "MW" : ""}
              </strong>
            </div>
            <div>
              <span>Operador</span>
              <strong>{displayValue(center.empresa)}</strong>
            </div>
          </div>
          <h3>Indicadores disponíveis</h3>
          {indicators.length ? (
            indicators.map((i) => (
              <div className="detail-indicator" key={i.id}>
                <span>
                  {displayValue(i.tipo)}
                  <small>{displayValue(i.periodo)}</small>
                </span>
                <strong>
                  {number(i.valor)} {i.valor != null ? i.unidade : ""}
                </strong>
                {i.observacoes && <p>{displayValue(i.observacoes)}</p>}
                <SourceReference
                  source={data.sources.find((s) => s.id === i.fonteId)}
                />
              </div>
            ))
          ) : (
            <EmptyState compact title="Sem indicadores cadastrados" />
          )}
          <h3>Benefícios associados</h3>
          {benefits.length ? (
            benefits.map((b) => (
              <div className="detail-benefit" key={b.id}>
                <strong>{displayValue(b.tipo)}</strong>
                <p>{displayValue(b.descricao)}</p>
                <SourceReference
                  source={data.sources.find((s) => s.id === b.fonteId)}
                />
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum benefício cadastrado para esta instalação.
            </p>
          )}
          <h3>Fontes e referências</h3>
          {sources.length ? (
            sources.map((s) => (
              <div className="detail-source" key={s.id}>
                <p>{displayValue(s.titulo)}</p>
                <SourceReference source={s} />
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Sem fontes vinculadas.
            </p>
          )}
          <Link className="button-link" to={`/indicadores?center=${id}`}>
            Explorar indicadores
            <ArrowUpRight size={16} />
          </Link>
        </>
      ) : (
        <EmptyState compact />
      )}
    </aside>
  );
}
