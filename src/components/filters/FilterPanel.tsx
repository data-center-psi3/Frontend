import { RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { FilterSelect } from "../ui/filter-select";
import type { Dataset, Filters } from "../../types/api";
export const emptyFilters: Filters = {
  country: "",
  state: "",
  city: "",
  center: "",
  period: "",
  search: "",
  indicator: "",
};
export function FilterPanel({
  data,
  filters,
  onChange,
}: {
  data: Dataset;
  filters: Filters;
  onChange: (f: Filters) => void;
}) {
  const options = (values: string[]) =>
    [...new Set(values.filter(Boolean))]
      .sort()
      .map((value) => ({ value, label: value }));
  const centers = data.centers.filter(
    (c) =>
      (!filters.country || c.pais === filters.country) &&
      (!filters.state || c.estado === filters.state) &&
      (!filters.city || c.cidade === filters.city),
  );
  return (
    <div className="filter-bar">
      <div className="filter-panel">
        <div className="filter-label">
          <SlidersHorizontal size={17} />
          <span>Filtros</span>
        </div>
        <FilterSelect
          label="País"
          value={filters.country}
          onChange={(country) =>
            onChange({ ...filters, country, state: "", city: "", center: "" })
          }
          options={options(data.centers.map((c) => c.pais))}
        />
        <FilterSelect
          label="Estado"
          value={filters.state}
          onChange={(state) =>
            onChange({ ...filters, state, city: "", center: "" })
          }
          options={options(
            data.centers
              .filter((c) => !filters.country || c.pais === filters.country)
              .map((c) => c.estado),
          )}
        />
        <FilterSelect
          label="Cidade"
          value={filters.city}
          onChange={(city) => onChange({ ...filters, city, center: "" })}
          options={options(
            data.centers
              .filter(
                (c) =>
                  (!filters.country || c.pais === filters.country) &&
                  (!filters.state || c.estado === filters.state),
              )
              .map((c) => c.cidade),
          )}
        />
        <FilterSelect
          label="Data center"
          value={filters.center}
          onChange={(center) => onChange({ ...filters, center })}
          options={centers.map((c) => ({ value: String(c.id), label: c.nome }))}
        />
        <FilterSelect
          label="Indicador"
          value={filters.indicator ?? ""}
          onChange={(indicator) => onChange({ ...filters, indicator })}
          options={options(data.indicators.map((i) => i.tipo))}
        />
        <FilterSelect
          label="Período"
          value={filters.period}
          onChange={(period) => onChange({ ...filters, period })}
          options={options(data.indicators.map((i) => i.periodo ?? ""))}
        />
        <div className="filter-search">
          <Search size={15} />
          <Input
            aria-label="Pesquisar data center"
            placeholder="Buscar instalação..."
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
          />
        </div>
        <Button
          variant="ghost"
          className="icon-button"
          aria-label="Limpar filtros"
          onClick={() => onChange(emptyFilters)}
        >
          <RotateCcw size={16} />
        </Button>
      </div>
      {Object.values(filters).some(Boolean) && (
        <div className="active-filters">
          <span>Filtros ativos</span>
          {Object.entries(filters)
            .filter(([, v]) => v)
            .map(([key, value]) => (
              <button
                key={key}
                onClick={() =>
                  onChange({
                    ...filters,
                    [key]: "",
                    ...(key === "country"
                      ? { state: "", city: "", center: "" }
                      : key === "state"
                        ? { city: "", center: "" }
                        : key === "city"
                          ? { center: "" }
                          : {}),
                  })
                }
                aria-label={`Remover filtro ${key}`}
              >
                <span>
                  {
                    (
                      {
                        country: "País",
                        state: "Estado",
                        city: "Cidade",
                        center: "Instalação",
                        period: "Período",
                        indicator: "Indicador",
                        search: "Busca",
                      } as Record<string, string>
                    )[key]
                  }
                  :{" "}
                  {key === "center"
                    ? (data.centers.find((c) => String(c.id) === value)?.nome ??
                      value)
                    : value}
                </span>
                <X size={12} />
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
