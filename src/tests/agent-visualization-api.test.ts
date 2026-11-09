import { beforeEach, describe, expect, it, vi } from "vitest";
import { askAgent, getConversation, getVisualizationPage } from "../services/agent";
import { createApi } from "../services/http/client";
vi.mock("../services/http/client", () => ({ createApi: vi.fn() }));
const get = vi.fn(), post = vi.fn();
beforeEach(() => { get.mockReset(); post.mockReset(); vi.mocked(createApi).mockReturnValue({ get, post } as unknown as ReturnType<typeof createApi>); });
describe("Visualization API adapter", () => {
  it("preserves the real chartData payload without duplicating visualization", async () => {
    const spec = { schemaVersion: "1.0", type: "table", data: [] };
    post.mockResolvedValue({ data: { response: "Dados", conversationId: "c", chartData: spec, visualization: spec } });
    expect((await askAgent("Pergunta")).visualizations).toEqual([spec]);
  });
  it("handles chartData null and legacy responses", async () => {
    post.mockResolvedValue({ data: { response: "Texto", chartData: null } });
    expect((await askAgent("Pergunta")).visualizations).toEqual([]);
  });
  it("restores each specification from its own historical message", async () => {
    const first = { schemaVersion: "1.0", type: "table", data: [{ value: 1 }] };
    const second = { schemaVersion: "1.0", type: "chart", data: [{ value: 2 }] };
    get.mockResolvedValue({ data: { id: "session", expired: false, messages: [
      { role: "user", content: "Pergunta" }, { role: "assistant", content: "Primeira", chartData: first },
      { role: "assistant", content: "Segunda", visualization: second },
    ] } });
    const session = await getConversation("session");
    expect(session.messages.map((m) => m.visualizations)).toEqual([[], [first], [second]]);
    expect(get).toHaveBeenCalledWith("/agent/conversations/session", expect.any(Object));
  });
  it("constructs a local scoped pagination URL rather than fetching a supplied endpoint", async () => {
    get.mockResolvedValue({ data: { datasetId: "dataset", page: 0, data: [{ x: null }], hasNext: false, totalElements: 1 } });
    expect((await getVisualizationPage("session", "dataset", 0)).data[0].x).toBeNull();
    expect(get).toHaveBeenCalledWith("/agent/conversations/session/datasets/dataset", expect.objectContaining({ params: { page: 0, size: 50 } }));
    get.mockResolvedValue({ data: { datasetId: "other", page: 0, data: [], hasNext: false, totalElements: 0 } });
    await expect(getVisualizationPage("session", "dataset", 0)).rejects.toThrow("Página de dados inválida");
  });
});
