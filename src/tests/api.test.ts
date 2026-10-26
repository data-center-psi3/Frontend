import { describe, it, expect, vi } from "vitest";
import { allPages } from "../services/http/pagination";
import { createApi } from "../services/http/client";
import { errorMessage } from "../services/http/errors";
import { loadDataset } from "../services/dataset";
import { AxiosError, type AxiosAdapter } from "axios";
describe("HTTP integration", () => {
  it("normalizes the API prefix and configures Basic auth in memory", () => {
    const api = createApi({
      baseUrl: "http://localhost:8080/",
      username: "test",
      password: "test-only",
    });
    expect(api.defaults.baseURL).toBe("http://localhost:8080/api");
    expect(api.defaults.auth?.username).toBe("test");
    expect(
      createApi({ baseUrl: "/api", username: "", password: "" }).defaults.auth,
    ).toBeUndefined();
    expect(
      createApi({ baseUrl: "/api", username: "", password: "" }).defaults
        .baseURL,
    ).toBe("/api");
  });
  it("follows all pages, including the map contract", async () => {
    const api = createApi({ baseUrl: "/api", username: "test", password: "" });
    const get = vi
      .spyOn(api, "get")
      .mockResolvedValueOnce({
        data: { content: [{ id: 1 }], page: { number: 0, totalPages: 2 } },
      })
      .mockResolvedValueOnce({
        data: { content: [{ id: 2 }], page: { number: 1, totalPages: 2 } },
      });
    expect(await allPages(api, "/mapa")).toEqual([{ id: 1 }, { id: 2 }]);
    expect(get).toHaveBeenNthCalledWith(
      2,
      "/mapa",
      expect.objectContaining({
        params: expect.objectContaining({ page: 1, sort: "id,asc" }),
      }),
    );
  });
  it("rejects unpaginated collection responses", async () => {
    const api = createApi({ baseUrl: "/api", username: "", password: "" });
    vi.spyOn(api, "get").mockResolvedValue({ data: [] });
    await expect(allPages(api, "/mapa")).rejects.toThrow("Resposta paginada");
  });
  it("loads all seven documented read endpoints with an HTTP adapter", async () => {
    const seen: string[] = [];
    const axios = (await import("axios")).default;
    const adapter: AxiosAdapter = async (config) => {
      seen.push(config.url!);
      return {
        data:
          config.url === "/dashboard"
            ? []
            : { content: [], page: { number: 0, totalPages: 0 } },
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      };
    };
    const previous = axios.defaults.adapter;
    axios.defaults.adapter = adapter;
    try {
      const data = await loadDataset({
        baseUrl: "/api",
        username: "test",
        password: "",
      });
      expect(data.centers).toEqual([]);
      expect(seen.sort()).toEqual(
        [
          "/beneficios",
          "/conteudos-pesquisa",
          "/dashboard",
          "/data-centers",
          "/fontes",
          "/indicadores-ambientais",
          "/mapa",
        ].sort(),
      );
    } finally {
      axios.defaults.adapter = previous;
    }
  });
  it("distinguishes authentication, connection and timeout errors", () => {
    const unauthorized = new AxiosError(
      "denied",
      undefined,
      undefined,
      undefined,
      { status: 401 } as never,
    );
    expect(errorMessage(unauthorized)).toContain("credenciais");
    expect(errorMessage(new AxiosError("timeout", "ECONNABORTED"))).toContain(
      "demorou",
    );
    expect(errorMessage(new AxiosError("network"))).toContain("CORS");
  });
});
