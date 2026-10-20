import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { DataCenterMap } from "../components/maps/DataCenterMap";
import { demo } from "../mocks/demo";
const map = vi.hoisted(() => ({
  getZoom: vi.fn(),
  getMaxZoom: () => 19,
  fitBounds: vi.fn(),
  setView: vi.fn(),
  invalidateSize: vi.fn(),
  getContainer: () => document.createElement("div"),
}));
vi.mock("react-leaflet", () => ({
  useMap: () => map,
  useMapEvents: () => map,
  MapContainer: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  TileLayer: () => null,
  Tooltip: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  Marker: ({
    children,
    eventHandlers,
  }: {
    children: ReactNode;
    eventHandlers: { click: () => void };
  }) => <button onClick={eventHandlers.click}>{children}</button>,
}));
let onResize: () => void;
beforeEach(() => {
  vi.clearAllMocks();
  map.getZoom.mockReturnValue(9);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: () => void) {
        onResize = callback;
      }
      observe() {}
      disconnect() {}
    },
  );
});
afterEach(() => vi.unstubAllGlobals());
describe("Map navigation", () => {
  it("does not reset bounds when selection recreates an identical point array", () => {
    const { rerender } = render(
      <DataCenterMap points={[demo.points[0]]} onSelect={() => {}} />,
    );
    expect(map.fitBounds).toHaveBeenCalledTimes(1);
    rerender(
      <DataCenterMap
        points={[{ ...demo.points[0] }]}
        selected={1}
        onSelect={() => {}}
      />,
    );
    expect(map.fitBounds).toHaveBeenCalledTimes(1);
    rerender(<DataCenterMap points={[demo.points[1]]} onSelect={() => {}} />);
    expect(map.fitBounds).toHaveBeenCalledTimes(2);
  });
  it("opens individual marker details without changing zoom or position", async () => {
    const select = vi.fn();
    render(<DataCenterMap points={[demo.points[0]]} onSelect={select} />);
    map.fitBounds.mockClear();
    await userEvent.click(screen.getByRole("button"));
    expect(map.setView).not.toHaveBeenCalled();
    expect(map.fitBounds).not.toHaveBeenCalled();
    expect(select).toHaveBeenCalledWith(1);
  });
  it("preserves the viewport when the details panel resizes the map", () => {
    const { rerender } = render(
      <DataCenterMap points={[demo.points[0]]} onSelect={() => {}} />,
    );
    map.fitBounds.mockClear();
    rerender(
      <DataCenterMap
        points={[{ ...demo.points[0] }]}
        selected={1}
        onSelect={() => {}}
      />,
    );
    onResize();
    expect(map.invalidateSize).toHaveBeenCalledWith({
      pan: true,
      animate: false,
    });
    expect(map.fitBounds).not.toHaveBeenCalled();
    expect(map.setView).not.toHaveBeenCalled();
  });
  it("still fits the overview when explicitly requested", () => {
    const { rerender } = render(
      <DataCenterMap points={[demo.points[0]]} onSelect={() => {}} />,
    );
    rerender(
      <DataCenterMap
        points={[demo.points[0]]}
        overviewKey={1}
        onSelect={() => {}}
      />,
    );
    expect(map.fitBounds).toHaveBeenCalledTimes(2);
  });
  it("keeps the map stationary at maximum zoom while opening details", async () => {
    map.getZoom.mockReturnValue(19);
    const select = vi.fn();
    render(<DataCenterMap points={[demo.points[0]]} onSelect={select} />);
    await userEvent.click(screen.getByRole("button"));
    expect(map.setView).not.toHaveBeenCalled();
    expect(select).toHaveBeenCalledWith(1);
  });
  it("always increases zoom when clicking a cluster instead of fitting wider bounds", async () => {
    render(
      <DataCenterMap
        points={[demo.points[0], { ...demo.points[0], id: 2 }]}
        onSelect={() => {}}
      />,
    );
    map.fitBounds.mockClear();
    await userEvent.click(screen.getByRole("button"));
    expect(map.setView).toHaveBeenCalledWith(
      [demo.points[0].latitude, demo.points[0].longitude],
      12,
    );
    expect(map.fitBounds).not.toHaveBeenCalled();
  });
});
