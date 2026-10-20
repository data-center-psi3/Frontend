import { useMemo, useState } from "react";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { Panel } from "../common";
import { Bars } from "./IndicatorChart";
import { displayValue } from "../../utils/data";
import { geographicGroups, operatorGroups } from "../../utils/geography";
import type { DataCenter } from "../../types/api";

export function GeographicDistribution({ centers }: { centers: DataCenter[] }) {
  const groups = useMemo(() => geographicGroups(centers), [centers]);
  const [stateKey, setStateKey] = useState<string>();
  const [cityKey, setCityKey] = useState<string>();
  const [operatorKey, setOperatorKey] = useState<string>();
  const [showAll, setShowAll] = useState(false);
  const state = groups.find((group) => group.key === stateKey);
  const city = state?.cities.find((city) => city.key === cityKey);
  const operators = operatorGroups(
    city?.records ?? [],
    (record) => record.empresa,
  );
  const operator = operators.find((group) => group.key === operatorKey);
  const records = operator?.records ?? [];
  const rows = operator
    ? records.map((record) => ({
        name:
          records.filter(
            (other) => displayValue(other.nome) === displayValue(record.nome),
          ).length > 1
            ? `${displayValue(record.nome)} · #${record.id}`
            : displayValue(record.nome),
        count: 1,
      }))
    : city
      ? operators
      : state
        ? state.cities
        : groups;
  const visible = showAll ? rows : rows.slice(0, 12);
  function reset() {
    setStateKey(undefined);
    setCityKey(undefined);
    setOperatorKey(undefined);
    setShowAll(false);
  }
  function backCities() {
    setCityKey(undefined);
    setOperatorKey(undefined);
    setShowAll(false);
  }
  function backOperators() {
    setOperatorKey(undefined);
    setShowAll(false);
  }
  const level = operator
    ? "instalações"
    : city
      ? "operadores"
      : state
        ? "cidades"
        : "estados";
  return (
    <Panel
      title="Distribuição geográfica"
      subtitle={
        operator
          ? `Instalações de ${operator.name} · ${city!.name} / ${state!.key}`
          : city
            ? `Operadores de ${city.name} / ${state!.key} · clique para ver as instalações`
            : state
              ? `Cidades de ${state.name} · clique em uma barra para ver os operadores`
              : "Instalações por estado · clique em uma barra para explorar as cidades"
      }
    >
      <div className="geography-navigation">
        <nav aria-label="Hierarquia do gráfico">
          <button onClick={reset} disabled={!state}>
            Estados
          </button>
          {state && (
            <>
              <ChevronRight size={14} />
              {city ? (
                <button onClick={backCities}>{state.name}</button>
              ) : (
                <span aria-current="location">{state.name}</span>
              )}
            </>
          )}
          {city && (
            <>
              <ChevronRight size={14} />
              {operator ? (
                <button onClick={backOperators}>{city.name}</button>
              ) : (
                <span aria-current="location">{city.name}</span>
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
        {state && (
          <button
            className="geography-back"
            onClick={operator ? backOperators : city ? backCities : reset}
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
      <div aria-live="polite" className="sr-only">
        Exibindo {level}
        {operator
          ? ` de ${operator.name}`
          : city
            ? ` de ${city.name}`
            : state
              ? ` de ${state.name}`
              : ""}
      </div>
      <Bars
        key={`${state?.key ?? "country"}:${city?.key ?? ""}:${operator?.key ?? ""}`}
        animate
        data={visible.map((row) => ({ name: row.name, value: row.count }))}
        unit="instalações"
        color="#059669"
        horizontal
        selectionLabel={(name) =>
          city
            ? `Abrir instalações do operador ${name}`
            : state
              ? `Abrir operadores de ${name}`
              : `Abrir cidades de ${name}`
        }
        onSelect={
          operator
            ? undefined
            : (name) => {
                if (city) {
                  setOperatorKey(
                    operators.find((group) => group.name === name)?.key,
                  );
                } else if (state) {
                  setCityKey(
                    state.cities.find((city) => city.name === name)?.key,
                  );
                  setOperatorKey(undefined);
                } else {
                  setStateKey(groups.find((group) => group.name === name)?.key);
                  setCityKey(undefined);
                  setOperatorKey(undefined);
                }
                setShowAll(false);
              }
        }
      />
      <div className="geography-footer">
        <p className="chart-explanation">
          Exibindo {visible.length} de {rows.length} {level}. Contagem de
          instalações nos filtros selecionados.
          {operator
            ? " Cada barra identifica uma instalação deste operador na cidade selecionada."
            : city
              ? " Selecione um operador para ver suas instalações. Cadastros sem operador identificado ficam em um grupo separado."
              : state
                ? " Selecione uma cidade para explorar os operadores."
                : " Selecione um estado para detalhar."}
        </p>
        {rows.length > 12 && (
          <button onClick={() => setShowAll((value) => !value)}>
            {showAll
              ? "Mostrar menos"
              : `Ver ${operator ? "todas as instalações" : city ? "todos os operadores" : state ? "todas as cidades" : "todos os estados"}`}
          </button>
        )}
      </div>
    </Panel>
  );
}
