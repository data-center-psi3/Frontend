import { useState } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Bars } from "./IndicatorChart";
import { Panel } from "../common";
import { displayValue, isMissing, normalize } from "../../utils/data";
import { operatorGroups, stateName } from "../../utils/geography";
import { radarMetrics, radarValue, validNumber } from "../../utils/radar";
import type {
  RadarCity,
  RadarMetric,
  RadarPoint,
  RadarState,
} from "../../types/radar";

const normalized = (value: string) =>
  normalize(value).replace(/\s+/g, " ").trim();
const cityKey = (city: RadarCity) =>
  JSON.stringify([city.uf, city.codigoIbge ?? normalized(city.municipio)]);
type QueryStatus = {
  isPending: boolean;
  isError: boolean;
  refetch: () => unknown;
};
export function RadarGeographicChart({
  uf,
  metric,
  states,
  cities,
  records,
  query,
  recordsQuery,
  onState,
  onOpen,
}: {
  uf: string;
  metric: RadarMetric;
  states: RadarState[];
  cities: RadarCity[];
  records: (RadarPoint & { codigoIbge?: string | null })[];
  query: QueryStatus;
  recordsQuery: QueryStatus;
  onState: (uf: string) => void;
  onOpen: (id: number) => void;
}) {
  const [selectedCity, setSelectedCity] = useState<string>();
  const [selectedOperator, setSelectedOperator] = useState<string>();
  const [showAll, setShowAll] = useState(false);
  const city = cities.find(
    (city) => cityKey(city) === selectedCity && city.uf === uf,
  );
  const scope = uf ? stateName(uf) : "Brasil";
  const cityLabel = (row: RadarCity) =>
    cities.filter(
      (other) => normalized(other.municipio) === normalized(row.municipio),
    ).length > 1
      ? `${row.municipio} · ${row.codigoIbge ?? row.uf}`
      : row.municipio;
  const facilities = city
    ? records.filter(
        (row) =>
          row.uf === city.uf &&
          ("codigoIbge" in row
            ? city.codigoIbge
              ? row.codigoIbge === city.codigoIbge
              : !row.codigoIbge &&
                normalized(row.municipio) === normalized(city.municipio)
            : cities.filter(
                (other) =>
                  other.uf === city.uf &&
                  normalized(other.municipio) === normalized(city.municipio),
              ).length === 1 &&
              normalized(row.municipio) === normalized(city.municipio)),
      )
    : [];
  const operators = operatorGroups(facilities, (row) => row.operador);
  const operator = operators.find((group) => group.key === selectedOperator);
  const operatorRows = operators
    .map((group) => {
      const values = group.records
        .map((row) =>
          metric === "ix"
            ? row.ixConectados
            : metric === "carriers"
              ? row.carriers
              : row.redesConectadas,
        )
        .filter(validNumber);
      const sum = values.length ? values.reduce((a, b) => a + b, 0) : null;
      const value =
        metric === "installations"
          ? group.count
          : metric === "operators"
            ? group.known
              ? 1
              : null
            : sum !== null && Number.isSafeInteger(sum)
              ? metric === "averageNetworks"
                ? Math.round((sum / values.length) * 100) / 100
                : sum
              : null;
      return { key: group.key, name: group.name, value };
    })
    .sort((a, b) =>
      a.value === null
        ? b.value === null
          ? 0
          : 1
        : b.value === null
          ? -1
          : b.value - a.value || a.name.localeCompare(b.name, "pt-BR"),
    );
  const operatorFacilities = operator?.records ?? [];
  const value = (row: RadarPoint) =>
    metric === "installations"
      ? 1
      : metric === "operators"
        ? isMissing(row.operador) ||
          normalized(row.operador ?? "") === "desconhecido"
          ? null
          : 1
        : metric === "ix"
          ? row.ixConectados
          : metric === "carriers"
            ? row.carriers
            : row.redesConectadas;
  const facilityRows = operatorFacilities
    .map((row) => ({
      id: row.id,
      name:
        operatorFacilities.filter(
          (other) => displayValue(other.unidade) === displayValue(row.unidade),
        ).length > 1
          ? `${displayValue(row.unidade)} · ${row.sourceId && operatorFacilities.filter((other) => other.sourceId === row.sourceId && displayValue(other.unidade) === displayValue(row.unidade)).length === 1 ? row.sourceId : `#${row.id}`}`
          : displayValue(row.unidade),
      value: value(row),
    }))
    .sort((a, b) =>
      a.value === null
        ? b.value === null
          ? 0
          : 1
        : b.value === null
          ? -1
          : b.value - a.value || a.name.localeCompare(b.name, "pt-BR"),
    );
  const allRows = operator
    ? facilityRows.filter((row): row is typeof row & { value: number } =>
        validNumber(row.value),
      )
    : city
      ? operatorRows.filter((row): row is typeof row & { value: number } =>
          validNumber(row.value),
        )
      : uf
        ? cities
            .filter((row) => radarValue(row, metric) !== null)
            .map((row) => ({
              name: cityLabel(row),
              value: radarValue(row, metric)!,
            }))
        : states
            .filter((row) => radarValue(row, metric) !== null)
            .map((row) => ({
              name: stateName(row.uf),
              value: radarValue(row, metric)!,
            }));
  const visible = showAll ? allRows : allRows.slice(0, 12);
  const currentQuery = city ? recordsQuery : query;
  const unit =
    operator && metric === "operators"
      ? "operador identificado na instalação"
      : operator && metric === "averageNetworks"
        ? "redes registradas na instalação"
        : radarMetrics[metric].unit;
  function back() {
    setSelectedCity(undefined);
    setSelectedOperator(undefined);
    setShowAll(false);
  }
  function backOperators() {
    setSelectedOperator(undefined);
    setShowAll(false);
  }
  return (
    <Panel
      title={
        operator
          ? `Instalações de ${operator.name}`
          : city
            ? `Operadores de ${city.municipio}`
            : uf
              ? `Municípios de ${scope}`
              : "Distribuição por estado"
      }
      subtitle={unit}
    >
      <div className="geography-navigation">
        <nav aria-label="Hierarquia do gráfico do Radar">
          <button disabled={!uf} onClick={() => onState("")}>
            Estados
          </button>
          {uf && (
            <>
              <ChevronRight size={14} />
              {city ? (
                <button onClick={back}>{scope}</button>
              ) : (
                <span aria-current="location">{scope}</span>
              )}
            </>
          )}
          {city && (
            <>
              <ChevronRight size={14} />
              {operator ? (
                <button onClick={backOperators}>{city.municipio}</button>
              ) : (
                <span aria-current="location">{city.municipio}</span>
              )}
            </>
          )}
          {operator && (
            <>
              <ChevronRight size={14} />
              <span aria-current="location">{operator.name}</span>
            </>
          )}
        </nav>
        {uf && (
          <button
            className="geography-back"
            onClick={operator ? backOperators : city ? back : () => onState("")}
          >
            <ArrowLeft size={14} />
            {operator
              ? "Voltar aos operadores"
              : city
                ? "Voltar às cidades"
                : "Voltar aos estados"}
          </button>
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        {operator
          ? `Exibindo instalações de ${operator.name} em ${city!.municipio}`
          : city
            ? `Exibindo operadores de ${city.municipio}`
            : uf
              ? `Exibindo cidades de ${scope}`
              : "Exibindo estados"}
      </p>
      {currentQuery.isPending ? (
        <p className="radar-status" role="status">
          Carregando {city ? "instalações" : "distribuição geográfica"}…
        </p>
      ) : currentQuery.isError ? (
        <div className="radar-error" role="alert">
          Não foi possível carregar{" "}
          {city ? "instalações" : "distribuição geográfica"}.
          <button onClick={() => currentQuery.refetch()}>
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          <Bars
            key={`${uf}:${selectedCity ?? "states"}:${selectedOperator ?? "operators"}:${metric}`}
            data={visible}
            unit={unit}
            allowDecimals={metric === "averageNetworks"}
            horizontal
            animate
            selectionLabel={(name) =>
              operator
                ? `Ver detalhes de ${name}`
                : city
                  ? `Abrir instalações do operador ${name}`
                  : uf
                    ? `Abrir operadores de ${name}`
                    : `Abrir cidades de ${name}`
            }
            onSelect={(name) => {
              if (operator) {
                const row = facilityRows.find((row) => row.name === name);
                if (row) onOpen(row.id);
              } else if (city) {
                const row = operatorRows.find((row) => row.name === name);
                if (row) {
                  setSelectedOperator(row.key);
                  setShowAll(false);
                }
              } else if (uf) {
                const row = cities.find((row) => cityLabel(row) === name);
                if (row) {
                  setSelectedCity(cityKey(row));
                  setSelectedOperator(undefined);
                  setShowAll(false);
                }
              } else {
                const row = states.find((row) => stateName(row.uf) === name);
                if (row) onState(row.uf);
              }
            }}
          />
          <div className="geography-footer">
            <p className="chart-explanation">
              Exibindo {visible.length} de {allRows.length}{" "}
              {operator
                ? "instalações com valor informado"
                : city
                  ? "grupos de operadores com valor informado"
                  : uf
                    ? "cidades"
                    : "estados"}
              .
              {operator
                ? metric === "installations"
                  ? " Cada barra representa uma instalação cadastrada. Clique para ver os detalhes."
                  : " Valores individuais por instalação. Clique para ver os detalhes."
                : city
                  ? " Selecione um operador para ver suas instalações nesta cidade. Cadastros sem operador identificado ficam em um grupo separado."
                  : uf
                    ? " Selecione uma cidade para explorar os operadores."
                    : " Selecione um estado para explorar as cidades."}
            </p>
            {allRows.length > 12 && (
              <button onClick={() => setShowAll((value) => !value)}>
                {showAll
                  ? "Mostrar menos"
                  : operator
                    ? "Ver todas as instalações"
                    : city
                      ? "Ver todos os operadores"
                      : uf
                        ? "Ver todas as cidades"
                        : "Ver todos os estados"}
              </button>
            )}
          </div>
          {operator && facilityRows.some((row) => row.value === null) && (
            <div className="radar-method-note radar-missing-installations">
              Instalações sem informação para esta métrica:{" "}
              {facilityRows
                .filter((row) => row.value === null)
                .map((row) => (
                  <button
                    className="radar-clear"
                    key={row.id}
                    onClick={() => onOpen(row.id)}
                  >
                    {row.name}
                  </button>
                ))}
            </div>
          )}
          {city &&
            !operator &&
            operatorRows.some((row) => row.value === null) && (
              <div className="radar-method-note radar-missing-installations">
                Grupos sem informação para esta métrica:{" "}
                {operatorRows
                  .filter((row) => row.value === null)
                  .map((row) => (
                    <button
                      className="radar-clear"
                      key={row.key}
                      onClick={() => {
                        setSelectedOperator(row.key);
                        setShowAll(false);
                      }}
                    >
                      {row.name}
                    </button>
                  ))}
              </div>
            )}
          {city && facilities.length < city.totalInstalacoes && (
            <p className="radar-method-note">
              {city.totalInstalacoes - facilities.length} instalações não têm
              detalhamento disponível nesta fonte.
            </p>
          )}
        </>
      )}
    </Panel>
  );
}
