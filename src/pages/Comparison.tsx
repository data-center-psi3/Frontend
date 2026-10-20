import { useState } from "react";
import {
  Search,
  SlidersHorizontal,
  X,
  CheckCheck,
  Building2,
} from "lucide-react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { FilterSelect } from "../components/ui/filter-select";
import { Panel, EmptyState, SourceReference } from "../components/common";
import { Bars } from "../components/charts/IndicatorChart";
import { comparableGroups, normalize, displayValue } from "../utils/data";
import { indicatorColor } from "../constants/design";
import { IndicatorTable } from "./Indicators";
import type { ViewProps } from "./Dashboard";
export function Comparison(props: ViewProps) {
  const [selectedCenters, setSelectedCenters] = useState<number[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState("");
  const types = [...new Set(props.indicators.map((i) => i.tipo))];
  const periods = [
    ...new Set(
      props.indicators.map((i) => i.periodo).filter((p): p is string => !!p),
    ),
  ].sort();
  const toggle = <T,>(values: T[], value: T) =>
    values.includes(value)
      ? values.filter((v) => v !== value)
      : [...values, value];
  const visibleCenters = props.centers.filter((c) =>
    normalize(
      `${displayValue(c.nome)} ${displayValue(c.cidade)} ${displayValue(c.estado)}`,
    ).includes(normalize(search)),
  );
  const activeCenters = props.centers.filter((c) =>
    selectedCenters.includes(c.id),
  );
  const records = props.indicators.filter(
    (i) =>
      selectedCenters.includes(i.dataCenterId) &&
      selectedTypes.includes(i.tipo) &&
      (!period || i.periodo === period),
  );
  const grouped = comparableGroups(records);
  return (
    <>
      <div className="comparison-workflow">
        <span className={selectedTypes.length ? "done" : ""}>
          <i>1</i>Indicadores
        </span>
        <span className={activeCenters.length >= 2 ? "done" : ""}>
          <i>2</i>Instalações
        </span>
        <span className={period ? "done" : ""}>
          <i>3</i>Período
        </span>
        <span>
          <i>4</i>Análise & fontes
        </span>
      </div>
      <Card className="comparison-select">
        <div className="selection-section">
          <fieldset>
            <legend>
              <span className="step-number">01</span>O que você quer comparar?
            </legend>
            <p>
              Selecione uma ou mais medidas. Unidades diferentes terão gráficos
              separados.
            </p>
            <div className="check-grid">
              {types.map((t) => (
                <label className="check-chip" key={t}>
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(t)}
                    onChange={() => setSelectedTypes(toggle(selectedTypes, t))}
                  />
                  <span
                    className="semantic-dot"
                    style={{ background: indicatorColor(t) }}
                  />
                  {t}
                </label>
              ))}
              {!types.length && (
                <p>Nenhum indicador disponível nos filtros atuais.</p>
              )}
            </div>
          </fieldset>
          <div className="selection-period">
            <span className="step-number">03</span>
            <FilterSelect
              label="Período de referência"
              value={period}
              onChange={setPeriod}
              options={periods.map((value) => ({ value, label: value }))}
              placeholder="Todos os períodos disponíveis"
            />
          </div>
        </div>
        <fieldset className="center-selection">
          <div className="selection-heading">
            <legend>
              <span className="step-number">02</span>Quais instalações?
            </legend>
            <span>{activeCenters.length} selecionadas</span>
          </div>
          <div className="filter-search">
            <Search size={16} />
            <Input
              aria-label="Pesquisar instalações para comparação"
              placeholder="Pesquisar por nome, cidade ou estado..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="center-check-list">
            {visibleCenters.map((c) => (
              <label
                className={`check-chip center-check ${selectedCenters.includes(c.id) ? "selected" : ""}`}
                key={c.id}
              >
                <input
                  type="checkbox"
                  checked={selectedCenters.includes(c.id)}
                  onChange={() =>
                    setSelectedCenters(toggle(selectedCenters, c.id))
                  }
                />
                <Building2 size={17} />
                <span>
                  {displayValue(c.nome)}
                  <small>
                    {displayValue(c.cidade)}/{displayValue(c.estado)}
                  </small>
                </span>
              </label>
            ))}
            {!visibleCenters.length && (
              <EmptyState
                compact
                title="Nenhuma instalação encontrada"
                description="Experimente outra pesquisa ou ajuste os filtros globais."
              />
            )}
          </div>
        </fieldset>
        <div className="comparison-selection-footer">
          <span>
            <SlidersHorizontal size={15} />
            {selectedTypes.length} medidas · {activeCenters.length} instalações
            · {period || "todos os períodos"}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedCenters([]);
              setSelectedTypes([]);
              setPeriod("");
              setSearch("");
            }}
          >
            <X size={14} />
            Limpar seleção
          </Button>
        </div>
      </Card>
      <div className="data-context">
        <CheckCheck size={17} />
        <p>
          Cada gráfico mantém o mesmo indicador, unidade e período. Valores
          ausentes permanecem identificados; evidências qualitativas continuam
          na tabela.
        </p>
      </div>
      {activeCenters.length < 2 || !selectedTypes.length ? (
        <Card className="comparison-placeholder">
          <EmptyState
            title="Monte sua comparação"
            description="Selecione os indicadores e pelo menos duas instalações. Os gráficos e as fontes aparecerão nesta área."
          />
        </Card>
      ) : (
        <>
          <div className="two-columns">
            {grouped.map((g, index) => {
              const sources = props.data.sources.filter((s) =>
                g.some((i) => i.fonteId === s.id),
              );
              return (
                <Panel
                  key={index}
                  title={displayValue(g[0].tipo)}
                  subtitle={`${displayValue(g[0].unidade)} · Período: ${displayValue(g[0].periodo)}`}
                  action={
                    <span className="scope-badge">
                      {new Set(g.map((i) => i.dataCenterId)).size} instalações
                    </span>
                  }
                >
                  <Bars
                    data={g.map((i) => ({
                      name:
                        props.centers.find((c) => c.id === i.dataCenterId)
                          ?.nome ?? String(i.dataCenterId),
                      value: i.valor!,
                    }))}
                    unit={g[0].unidade ?? ""}
                    color={indicatorColor(g[0].tipo)}
                  />
                  <p className="chart-explanation">
                    {new Set(g.map((i) => i.dataCenterId)).size < 2
                      ? "Apenas uma instalação tem valores nesta unidade e período; não há comparação entre instalações."
                      : "Porte, método de medição e condições locais podem afetar a interpretação."}
                  </p>
                  <div className="chart-sources">
                    <span>Fontes:</span>
                    {sources.length ? (
                      sources.map((s) => (
                        <SourceReference key={s.id} source={s} />
                      ))
                    ) : (
                      <span>Não informado</span>
                    )}
                  </div>
                </Panel>
              );
            })}
          </div>
          {!grouped.length && (
            <Card className="comparison-placeholder">
              <EmptyState
                title="Sem valores comparáveis"
                description="Os registros selecionados não possuem valor, unidade e período suficientes. Consulte as evidências qualitativas abaixo."
              />
            </Card>
          )}
          <Panel
            title="Valores e referências"
            subtitle={`${records.length} registros · dados conforme as fontes cadastradas`}
          >
            <IndicatorTable {...props} indicators={records} />
          </Panel>
        </>
      )}
    </>
  );
}
