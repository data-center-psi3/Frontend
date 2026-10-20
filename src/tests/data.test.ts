import { describe, it, expect } from "vitest";
import {
  filterCenters,
  filterIndicators,
  number,
  comparableGroups,
  categoryOf,
  date,
  safeUrl,
  csv,
  displayValue,
  isMissing,
} from "../utils/data";
import { emptyFilters } from "../components/filters/FilterPanel";
import { demo } from "../mocks/demo";
import { validPoint } from "../components/maps/DataCenterMap";
describe("Interpretation and filtering of environmental data", () => {
  it("standardizes missing markers without hiding valid zero or negative values", () => {
    for (const value of [
      null,
      undefined,
      "",
      "  ",
      "NULL",
      "undefined",
      "__",
      "---",
      "—",
      "N/A",
      "n.d.",
      "Não informada",
      "nao informado",
      "Não disponíveis",
    ]) {
      expect(displayValue(value)).toBe("Não informado");
    }
    for (const value of [
      0,
      "0",
      -1,
      false,
      "Não",
      "Não se aplica",
      "Empresa — SP",
    ]) {
      expect(isMissing(value)).toBe(false);
      expect(displayValue(value)).toBe(String(value));
    }
    expect(date(null)).toBe("Não informado");
    expect(date("__")).toBe("Não informado");
  });
  it("preserves zero and missing values distinctly", () => {
    expect(number(null)).toBe("Não informado");
    expect(number(0)).toBe("0");
    expect(number(1250.5)).toBe("1.250,5");
    expect(number(1.2574)).toBe("1,2574");
    expect(number(NaN)).toBe("Não informado");
  });
  it("combines geographic, center and textual filters", () => {
    const result = filterCenters(demo.centers, {
      ...emptyFilters,
      country: "Brasil",
      state: "SP",
      search: "hortolandia",
    });
    expect(result).toHaveLength(1);
    expect(result[0].cidade).toBe("Hortolândia");
    expect(
      filterCenters(demo.centers, {
        ...emptyFilters,
        state: "RJ",
        center: "1",
      }),
    ).toHaveLength(0);
  });
  it("restricts indicators to centers and reporting period", () => {
    const values = filterIndicators(demo.indicators, [demo.centers[0]], "2024");
    expect(values).toHaveLength(5);
    expect(
      values.every((i) => i.dataCenterId === 1 && i.periodo === "2024"),
    ).toBe(true);
  });
  it("never combines unlike units, types or periods", () => {
    const base = demo.indicators[0];
    const data = [
      { ...base, id: 1, unidade: "MWh", periodo: "2024" },
      { ...base, id: 2, unidade: "kWh", periodo: "2024" },
      { ...base, id: 3, unidade: "MWh", periodo: "2025" },
      { ...base, id: 4, unidade: "MWh", periodo: "2024", tipo: "PUE" },
      { ...base, id: 5, valor: null },
    ];
    const result = comparableGroups(data);
    expect(result).toHaveLength(4);
    expect(result.every((g) => g.length === 1)).toBe(true);
  });
  it("recognizes PUE, WUE and accent-bearing types", () => {
    expect(categoryOf("PUE")).toBe("energia");
    expect(categoryOf("WUE")).toBe("agua");
    expect(categoryOf("Emissões")).toBe("emissoes");
  });
  it("keeps calendar dates without timezone shifts and rejects unsafe links", () => {
    expect(date("2026-10-14")).toBe("14/10/2026");
    expect(safeUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeUrl("https://example.com")).toBe("https://example.com/");
  });
  it("omits coordinates that are missing or out of range and accepts zero", () => {
    const point = demo.points[0];
    expect(validPoint({ ...point, latitude: null })).toBe(false);
    expect(validPoint({ ...point, longitude: 190 })).toBe(false);
    expect(validPoint({ ...point, latitude: 0, longitude: 0 })).toBe(true);
  });
  it("escapes CSV values and neutralizes spreadsheet formulas", () => {
    const result = csv([
      { nome: "=SUM(A1)", observacao: 'com "aspas"', valor: null },
    ]);
    expect(result).toContain("'=SUM(A1)");
    expect(result).toContain('com ""aspas""');
  });
});
