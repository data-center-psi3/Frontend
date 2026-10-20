import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FilterSelect } from "../components/ui/filter-select";
import {
  annualSeries,
  consumptionRecords,
  representativeRecord,
} from "../utils/analytics";
import { demo } from "../mocks/demo";
describe("Analytical redesign", () => {
  it("does not substitute efficiency ratios for consumption", () => {
    const records = consumptionRecords(demo.indicators, "energia");
    expect(records.every((r) => r.tipo !== "PUE")).toBe(true);
    expect(
      consumptionRecords(
        demo.indicators.filter((i) => i.tipo === "WUE"),
        "agua",
      ),
    ).toEqual([]);
  });
  it("preserves a reference record rather than inventing a mixed total", () => {
    const result = representativeRecord(
      demo.indicators.filter((i) => i.tipo === "Consumo de energia"),
    );
    expect(result?.periodo).toBe("2025");
    expect(
      demo.indicators.some(
        (i) => i.id === result?.id && i.valor === result.valor,
      ),
    ).toBe(true);
    expect(
      representativeRecord([{ ...demo.indicators[0], valor: null }]),
    ).toBeUndefined();
  });
  it("only forms annual history from compatible non-duplicated records", () => {
    const series = annualSeries(
      demo.indicators,
      1,
      "Consumo de energia",
      "MWh",
    );
    expect(series.map((i) => i.name)).toEqual(["2023", "2024", "2025"]);
    expect(
      annualSeries(
        [...demo.indicators, demo.indicators[0]],
        1,
        "Consumo de energia",
        "MWh",
      ),
    ).toEqual([]);
  });
  it("searches a long selector and applies the chosen option", async () => {
    const change = vi.fn();
    const options = Array.from({ length: 20 }, (_, i) => ({
      value: String(i),
      label: `Instalação ${i}`,
    }));
    render(
      <FilterSelect
        label="Data center"
        value=""
        onChange={change}
        options={options}
      />,
    );
    await userEvent.click(screen.getByLabelText("Data center"));
    await userEvent.type(
      screen.getByLabelText("Pesquisar data center"),
      "Instalação 19",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Instalação 19" }),
    );
    expect(change).toHaveBeenCalledWith("19");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
