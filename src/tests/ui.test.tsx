import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LoadingState, ErrorState, EmptyState } from "../components/common";
import { FilterPanel, emptyFilters } from "../components/filters/FilterPanel";
import { Comparison } from "../pages/Comparison";
import { Indicators } from "../pages/Indicators";
import { DataCenterDetails } from "../components/maps/DataCenterDetails";
import { MapPage } from "../pages/Map";
import { FilterSelect } from "../components/ui/filter-select";
import { demo } from "../mocks/demo";
vi.mock("../components/charts/IndicatorChart", () => ({
  Bars: ({ data }: { data: unknown[] }) => (
    <div data-testid="bars">{data.length} registros</div>
  ),
  Trend: () => <div>Histórico</div>,
}));
vi.mock("../components/maps/DataCenterMap", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../components/maps/DataCenterMap")>();
  return {
    ...original,
    DataCenterMap: ({ onSelect }: { onSelect: (id: number) => void }) => (
      <button onClick={() => onSelect(1)}>Selecionar marcador</button>
    ),
  };
});
const props = {
  data: demo,
  centers: demo.centers,
  indicators: demo.indicators,
};
describe("Interactive UI", () => {
  it("uses the styled selector for required choices without an empty option", async () => {
    const change = vi.fn();
    render(
      <FilterSelect
        label="Indicador de conectividade"
        allowEmpty={false}
        value="networks"
        onChange={change}
        options={[
          { value: "networks", label: "Redes registradas" },
          { value: "averageNetworks", label: "Média de redes" },
        ]}
      />,
    );
    const trigger = screen.getByRole("combobox", {
      name: "Indicador de conectividade",
    });
    expect(trigger.tagName).toBe("BUTTON");
    expect(trigger).toHaveClass("select-trigger");
    await userEvent.click(trigger);
    expect(screen.getAllByRole("option")).toHaveLength(2);
    expect(
      screen.queryByRole("option", { name: "Todos" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Média de redes" })).toHaveClass(
      "select-item",
    );
    await userEvent.click(
      screen.getByRole("option", { name: "Média de redes" }),
    );
    expect(change).toHaveBeenCalledWith("averageNetworks");
  });
  it("renders loading, empty and retry states accessibly", async () => {
    const retry = vi.fn();
    const { unmount } = render(<LoadingState />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    unmount();
    render(
      <>
        <EmptyState />
        <ErrorState
          message="Falha de conexão"
          onRetry={retry}
          onConfigure={() => {}}
        />
      </>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Falha de conexão");
    await userEvent.click(screen.getByText("Tentar novamente"));
    expect(retry).toHaveBeenCalledOnce();
  });
  it("applies and clears text filters", async () => {
    const change = vi.fn();
    render(
      <FilterPanel data={demo} filters={emptyFilters} onChange={change} />,
    );
    await userEvent.type(screen.getByLabelText("Pesquisar data center"), "a");
    expect(change).toHaveBeenCalledWith(
      expect.objectContaining({ search: "a" }),
    );
    await userEvent.click(screen.getByLabelText("Limpar filtros"));
    expect(change).toHaveBeenLastCalledWith(emptyFilters);
  });
  it("changes indicator categories and keeps qualitative records", async () => {
    render(
      <MemoryRouter>
        <Indicators {...props} />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole("tab", { name: "Água" }));
    expect(screen.getByRole("tab", { name: "Água" })).toHaveAttribute(
      "data-state",
      "active",
    );
    expect(screen.queryByText("PUE")).not.toBeInTheDocument();
    expect(screen.getAllByText("Consumo de água").length).toBeGreaterThan(0);
  });
  it("requires two centers and renders separate comparison groups", async () => {
    render(<Comparison {...props} />);
    expect(screen.getByText("Monte sua comparação")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("checkbox", { name: /Instalação demonstrativa 01/ }),
    );
    await userEvent.click(
      screen.getByRole("checkbox", { name: /Instalação demonstrativa 02/ }),
    );
    await userEvent.click(
      screen.getByRole("checkbox", { name: "Consumo de energia" }),
    );
    expect(screen.getAllByTestId("bars")).toHaveLength(3);
    expect(
      screen
        .getAllByTestId("bars")
        .every((c) => c.textContent === "2 registros"),
    ).toBe(true);
  });
  it("selects a marker and opens full details with source references", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <MapPage
            {...props}
            mode="demo"
            connection={null}
            connectionVersion={0}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await userEvent.click(screen.getByText("Selecionar marcador"));
    expect(
      screen.getByRole("complementary", { name: "Detalhes do data center" }),
    ).toHaveTextContent("Instalação demonstrativa 01");
    expect(screen.getByText("Fontes e referências")).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText("Fechar detalhes"));
    expect(
      screen.queryByRole("complementary", { name: "Detalhes do data center" }),
    ).not.toBeInTheDocument();
  });
  it("retains missing power as missing in the detail panel", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <DataCenterDetails
            id={8}
            data={demo}
            mode="demo"
            connection={null}
            connectionVersion={0}
            onClose={() => {}}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByText("Não informado")).toBeInTheDocument();
  });
});
