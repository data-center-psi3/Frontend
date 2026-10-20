import { describe, it, expect, vi, afterEach } from "vitest";
import axios, { type AxiosAdapter } from "axios";
import { radarService } from "../services/radar";
import {
  heatSupported,
  heatWeight,
  radarValue,
  rankRadar,
  validRadarPoint,
  radarRegion,
} from "../utils/radar";
import type { RadarState, RadarPoint } from "../types/radar";
const filters = {
  uf: "SP",
  region: "Sudeste",
  operator: "Operador A",
  installationType: "Colocation",
};
const connection = { baseUrl: "/api", username: "", password: "" };
const originalAdapter = axios.defaults.adapter;
afterEach(() => {
  axios.defaults.adapter = originalAdapter;
  vi.restoreAllMocks();
});
describe("Radar API contracts", () => {
  it("uses real paths, AND filters and cancellation without pagination envelopes", async () => {
    const adapter = vi.fn<AxiosAdapter>(async (config) => ({
      data: config.url?.endsWith("overview") ? { totalInstalacoes: 4 } : [],
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    }));
    axios.defaults.adapter = adapter;
    const service = radarService(connection),
      signal = new AbortController().signal;
    await service.overview(filters, signal);
    await service.states(filters, "operators", signal);
    await service.points(filters, signal);
    await service.cities("SP", filters, "averageNetworks", signal);
    expect(adapter.mock.calls.map(([config]) => config.url)).toEqual([
      "/radar/overview",
      "/radar/states",
      "/radar/map",
      "/radar/states/SP/cities",
    ]);
    expect(adapter.mock.calls[0][0]).toMatchObject({
      baseURL: "/api",
      params: filters,
      signal,
    });
    expect(adapter.mock.calls[1][0].params.sortBy).toBe("operators");
    expect(adapter.mock.calls[3][0].params.sortBy).toBe("networks");
  });
  it("omits empty filters and rejects paginated lists instead of inventing results", async () => {
    const adapter = vi.fn<AxiosAdapter>(async (config) => ({
      data: { content: [], page: { totalPages: 1 } },
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    }));
    axios.defaults.adapter = adapter;
    await expect(
      radarService(connection).points({
        uf: "",
        region: "",
        operator: "",
        installationType: "",
      }),
    ).rejects.toThrow("sem envelope");
    expect(adapter.mock.calls[0][0].params).toEqual({});
  });
});
describe("Radar integrity", () => {
  it("uses server distinct operators, keeps unknown below genuine zero and never mutates rankings", () => {
    const rows = [
      { uf: "SP", totalOperadores: 2, totalRedesRegistradas: null },
      { uf: "RJ", totalOperadores: 1, totalRedesRegistradas: 0 },
      { uf: "CE", totalOperadores: 3, totalRedesRegistradas: 20 },
    ] as RadarState[];
    expect(rankRadar(rows, "networks").map((row) => row.uf)).toEqual([
      "CE",
      "RJ",
      "SP",
    ]);
    expect(rows[0].uf).toBe("SP");
    expect(radarValue(rows[0], "networks")).toBeNull();
    expect(radarValue(rows[1], "networks")).toBe(0);
    expect(radarValue(rows[0], "operators")).toBe(2);
  });
  it("does not convert distinct operators, missing data or averages into heat weights", () => {
    const point = {
      latitude: -23,
      longitude: -46,
      redesConectadas: 0,
      ixConectados: null,
    } as RadarPoint;
    expect(heatWeight(point, "installations")).toBe(1);
    expect(heatWeight(point, "networks")).toBe(0);
    expect(heatWeight(point, "ix")).toBeNull();
    expect(heatWeight(point, "operators")).toBeNull();
    expect(heatSupported("operators")).toBe(false);
    expect(heatSupported("averageNetworks")).toBe(false);
    expect(validRadarPoint(point)).toBe(true);
    expect(validRadarPoint({ ...point, latitude: null })).toBe(false);
    expect(validRadarPoint({ ...point, longitude: 181 })).toBe(false);
    expect(radarRegion("SP")).toBe("Sudeste");
    expect(radarRegion("CE")).toBe("Nordeste");
  });
});
