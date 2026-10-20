import { describe, it, expect, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { MapPage } from "../pages/Map";
import { demo } from "../mocks/demo";

vi.mock("../components/maps/DataCenterMap", () => ({
  validPoint: () => true,
  DataCenterMap: () => <div data-testid="original-map" />,
}));
vi.mock("../components/DataCentersTable", () => ({
  DataCentersTable: () => null,
}));
vi.mock("../pages/Radar/RadarPage", async () => {
  const { useState, useLayoutEffect } = await import("react");
  return {
    RadarPage: ({
      onClose,
      onViewReady,
    }: {
      onClose: () => void;
      onViewReady?: () => void;
    }) => {
      const [count, setCount] = useState(0);
      useLayoutEffect(() => {
        onViewReady?.();
      }, [onViewReady]);
      return (
        <section>
          <h2>Radar de teste</h2>
          <div className="radar-map-canvas" data-testid="radar-map" />
          <button onClick={() => setCount((value) => value + 1)}>
            Seleção {count}
          </button>
          <button onClick={onClose}>Voltar ao mapa de localizações</button>
        </section>
      );
    },
  };
});
const connection = { baseUrl: "/api", username: "", password: "" };
function LocationProbe() {
  const location = useLocation();
  return <output data-testid="search">{location.search}</output>;
}
function mount(ensureLocations: () => Promise<unknown>) {
  return render(
    <MemoryRouter
      initialEntries={["/mapa?mode=radar&view=states&metric=networks"]}
    >
      <MapPage
        data={demo}
        centers={demo.centers}
        indicators={demo.indicators}
        mode="real"
        connection={connection}
        connectionVersion={0}
        ensureLocations={ensureLocations}
      />
      <LocationProbe />
    </MemoryRouter>,
  );
}
describe("Map mode continuity", () => {
  it("keeps the current view while preparing locations and preserves both maps and Radar state on return", async () => {
    let finish!: () => void;
    const ready = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const ensure = vi.fn(() => ready);
    mount(ensure);
    await screen.findByRole("heading", { name: "Radar de teste" });
    const original = screen.getByTestId("original-map"),
      radar = screen.getByTestId("radar-map");
    await userEvent.click(screen.getByRole("button", { name: "Seleção 0" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Voltar ao mapa de localizações" }),
    );
    expect(ensure).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("heading", { name: "Radar de teste" }),
    ).toBeVisible();
    expect(screen.getByText("Preparando localizações…")).toBeVisible();
    expect(screen.queryByLabelText("Carregando dados")).not.toBeInTheDocument();
    await act(async () => {
      finish();
      await ready;
    });
    expect(
      await screen.findByRole("heading", { name: "Conecte os pontos." }),
    ).toBeVisible();
    expect(radar).toBeInTheDocument();
    expect(radar.closest(".map-mode-stage")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(original).toBe(screen.getByTestId("original-map"));
    await userEvent.click(
      screen.getByRole("button", { name: "Abrir mapa de calor" }),
    );
    expect(
      await screen.findByRole("button", { name: "Seleção 1" }),
    ).toBeVisible();
    expect(radar).toBe(screen.getByTestId("radar-map"));
    expect(screen.getByTestId("search")).toHaveTextContent(
      "view=states&metric=networks",
    );
  });
  it("keeps Radar usable after a failed return and allows retry without replacing the page", async () => {
    const ensure = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(undefined);
    mount(ensure);
    await userEvent.click(
      await screen.findByRole("button", {
        name: "Voltar ao mapa de localizações",
      }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "O Radar continua disponível",
    );
    expect(
      screen.getByRole("heading", { name: "Radar de teste" }),
    ).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Seleção 0" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Voltar ao mapa de localizações" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Conecte os pontos." }),
    ).toBeVisible();
    expect(ensure).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
