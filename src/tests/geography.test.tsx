import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { geographicGroups, operatorGroups } from "../utils/geography";
import { GeographicDistribution } from "../components/charts/GeographicDistribution";
import { RadarGeographicChart } from "../components/charts/RadarGeographicChart";
import type { RadarCity, RadarPoint } from "../types/radar";
import { MapPage } from "../pages/Map";
import { demo } from "../mocks/demo";

vi.mock("../components/charts/IndicatorChart", () => ({
  Bars: ({
    data,
    onSelect,
  }: {
    data: { name: string; value: number }[];
    onSelect?: (name: string) => void;
  }) => (
    <div data-testid="geographic-bars">
      {data.map((row) => (
        <button key={row.name} onClick={() => onSelect?.(row.name)}>
          {row.name}: {row.value}
        </button>
      ))}
    </div>
  ),
}));
vi.mock("../components/maps/DataCenterMap", () => ({
  validPoint: () => true,
  DataCenterMap: ({ points }: { points: unknown[] }) => (
    <div data-testid="map-point-count">{points.length}</div>
  ),
}));

describe("Geographic hierarchy", () => {
  it("keeps homonymous cities in different states apart and reconciles state counts", () => {
    const states = geographicGroups([
      { cidade: "Bom Jesus", estado: "SP" },
      { cidade: "Bom Jesus", estado: "RJ" },
      { cidade: "Campinas", estado: "São Paulo" },
    ]);
    expect(states).toHaveLength(2);
    expect(states[0]).toMatchObject({ key: "SP", count: 2 });
    expect(states[0].cities).toHaveLength(2);
    expect(states[0].cities[0].key).not.toBe(states[1].cities[0].key);
  });
  it("drills into state cities and returns to the state overview", async () => {
    render(<GeographicDistribution centers={demo.centers} />);
    await userEvent.click(screen.getByRole("button", { name: "São Paulo: 3" }));
    const chart = within(screen.getByTestId("geographic-bars"));
    expect(chart.getByText("Campinas: 1")).toBeInTheDocument();
    expect(chart.queryByText("Fortaleza: 1")).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Voltar aos estados" }),
    );
    expect(screen.getByText("São Paulo: 3")).toBeInTheDocument();
  });
  it("drills from cities into distinct installations, including records without coordinates, and goes back", async () => {
    const centers = [
      ...demo.centers,
      { ...demo.centers[0], id: 99, latitude: null, longitude: null },
    ];
    render(<GeographicDistribution centers={centers} />);
    await userEvent.click(screen.getByRole("button", { name: "São Paulo: 4" }));
    await userEvent.click(screen.getByRole("button", { name: "Campinas: 2" }));
    await userEvent.click(
      screen.getByRole("button", { name: `${centers[0].empresa}: 2` }),
    );
    const chart = within(screen.getByTestId("geographic-bars"));
    expect(chart.getByText(`${centers[0].nome} · #1: 1`)).toBeInTheDocument();
    expect(chart.getByText(`${centers[0].nome} · #99: 1`)).toBeInTheDocument();
    expect(chart.queryByText("Fortaleza: 1")).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Voltar aos operadores" }),
    );
    expect(screen.getByText(`${centers[0].empresa}: 2`)).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Voltar às cidades" }),
    );
    expect(screen.getByText("Campinas: 2")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Voltar aos estados" }),
    );
    expect(screen.getByText("São Paulo: 4")).toBeInTheDocument();
  });
  it("shows Radar facilities, preserves unknown connectivity and opens the correct source record", async () => {
    const cities = [
      {
        uf: "SP",
        municipio: "Campinas",
        codigoIbge: "3509502",
        totalInstalacoes: 2,
        totalRedesRegistradas: 0,
      },
    ] as RadarCity[];
    const records = [
      {
        id: -1,
        uf: "SP",
        municipio: "Campinas",
        unidade: "Com zero",
        operador: "Operador A",
        redesConectadas: 0,
        codigoIbge: "3509502",
        latitude: null,
        longitude: null,
      },
      {
        id: -2,
        uf: "SP",
        municipio: "Campinas",
        unidade: "Unidade sem redes",
        operador: "Operador A",
        redesConectadas: null,
        codigoIbge: "3509502",
      },
      {
        id: -3,
        uf: "RJ",
        municipio: "Campinas",
        unidade: "Outra UF",
        redesConectadas: 9,
        codigoIbge: null,
      },
    ] as (RadarPoint & { codigoIbge: string | null })[];
    const status = { isPending: false, isError: false, refetch: vi.fn() },
      open = vi.fn();
    render(
      <RadarGeographicChart
        uf="SP"
        metric="networks"
        states={[]}
        cities={cities}
        records={records}
        query={status}
        recordsQuery={status}
        onState={() => {}}
        onOpen={open}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Campinas: 0" }));
    expect(
      screen.getByRole("heading", { name: "Operadores de Campinas" }),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Operador A: 0" }),
    );
    expect(
      screen.getByRole("heading", { name: "Instalações de Operador A" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Com zero: 0" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Unidade sem redes: 0" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Outra UF: 9")).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Unidade sem redes" }),
    );
    expect(open).toHaveBeenCalledWith(-2);
    await userEvent.click(screen.getByRole("button", { name: "Com zero: 0" }));
    expect(open).toHaveBeenLastCalledWith(-1);
    await userEvent.click(
      screen.getByRole("button", { name: "Voltar aos operadores" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Voltar às cidades" }),
    );
    expect(screen.getByText("Campinas: 0")).toBeInTheDocument();
  });
  it("does not merge city records with a missing IBGE code into a different identified group", async () => {
    const cities = [
      {
        uf: "SP",
        municipio: "Campinas",
        codigoIbge: "3509502",
        totalInstalacoes: 1,
      },
      {
        uf: "SP",
        municipio: "Campinas",
        codigoIbge: null,
        totalInstalacoes: 1,
      },
    ] as RadarCity[];
    const records = [
      {
        id: -1,
        uf: "SP",
        municipio: "Campinas",
        unidade: "Com código",
        codigoIbge: "3509502",
      },
      {
        id: -2,
        uf: "SP",
        municipio: "Campinas",
        unidade: "Sem código",
        codigoIbge: null,
      },
    ] as (RadarPoint & { codigoIbge: string | null })[];
    const status = { isPending: false, isError: false, refetch: vi.fn() };
    render(
      <RadarGeographicChart
        uf="SP"
        metric="installations"
        states={[]}
        cities={cities}
        records={records}
        query={status}
        recordsQuery={status}
        onState={() => {}}
        onOpen={() => {}}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Campinas · 3509502: 1" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Operador não informado: 1" }),
    );
    expect(screen.getByText("Com código: 1")).toBeInTheDocument();
    expect(screen.queryByText("Sem código: 1")).not.toBeInTheDocument();
  });
  it("groups normalized operators and keeps unknown names in a distinct bucket", () => {
    const groups = operatorGroups(
      [
        { operator: " Órbita  Digital " },
        { operator: "orbita digital" },
        { operator: null },
        { operator: "—" },
      ],
      (row) => row.operator,
    );
    expect(
      groups.map((group) => ({ known: group.known, count: group.count })),
    ).toEqual(
      expect.arrayContaining([
        { known: true, count: 2 },
        { known: false, count: 2 },
      ]),
    );
    expect(groups.find((group) => group.known)?.name).toBe("Órbita Digital");
  });
  it("aggregates each operator using only valid observations for averages", async () => {
    const cities = [
      {
        uf: "SP",
        municipio: "Campinas",
        codigoIbge: null,
        totalInstalacoes: 4,
        conectividade: { mediaRedesPorInstalacao: 2 },
      },
    ] as RadarCity[];
    const records = [
      {
        id: -1,
        uf: "SP",
        municipio: "Campinas",
        unidade: "A1",
        operador: "Operador A",
        redesConectadas: 4,
      },
      {
        id: -2,
        uf: "SP",
        municipio: "Campinas",
        unidade: "A2",
        operador: "Operador A",
        redesConectadas: null,
      },
      {
        id: -3,
        uf: "SP",
        municipio: "Campinas",
        unidade: "B1",
        operador: "Operador B",
        redesConectadas: 0,
      },
      {
        id: -4,
        uf: "SP",
        municipio: "Campinas",
        unidade: "Sem operador",
        operador: null,
        redesConectadas: null,
      },
    ] as RadarPoint[];
    const status = { isPending: false, isError: false, refetch: vi.fn() };
    render(
      <RadarGeographicChart
        uf="SP"
        metric="averageNetworks"
        states={[]}
        cities={cities}
        records={records}
        query={status}
        recordsQuery={status}
        onState={() => {}}
        onOpen={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Campinas: 2" }));
    expect(screen.getByText("Operador A: 4")).toBeInTheDocument();
    expect(screen.getByText("Operador B: 0")).toBeInTheDocument();
    expect(
      screen.queryByText("Operador não informado: 0"),
    ).not.toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Operador A: 4" }),
    );
    expect(screen.getByText("A1: 4")).toBeInTheDocument();
    expect(screen.queryByText("B1: 0")).not.toBeInTheDocument();
  });
  it("expands with the separate arrow without changing the map, then selects a city", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <MapPage
            data={demo}
            centers={demo.centers}
            indicators={demo.indicators}
            mode="demo"
            connection={null}
            connectionVersion={0}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    const arrow = screen.getByRole("button", {
      name: "Expandir cidades de São Paulo",
    });
    await userEvent.click(arrow);
    expect(arrow).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("map-point-count")).toHaveTextContent("8");
    await userEvent.click(screen.getByRole("button", { name: /Campinas SP/ }));
    expect(screen.getByTestId("map-point-count")).toHaveTextContent("1");
    await userEvent.click(
      screen.getByRole("button", { name: "Recolher cidades de São Paulo" }),
    );
    expect(
      screen.queryByRole("button", { name: /Campinas SP/ }),
    ).not.toBeInTheDocument();
  });
});
