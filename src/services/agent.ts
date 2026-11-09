import { connection } from "../config/connection";
import { createApi } from "./http/client";
import { readRows, visualizationPayloads } from "../utils/agentVisualization";
import type { DataRow } from "../types/agentVisualization";

export type AgentResponse = { response: string; conversationId?: string; visualizations?: unknown[] };
export type AgentMessage = { role: "user" | "assistant"; content: string; visualizations?: unknown[] };
export type ConversationSummary = { id: string; title: string; updatedAt: string; expired: boolean };
export type Conversation = { id: string; messages: AgentMessage[]; expired: boolean };

export async function listConversations(signal?: AbortSignal): Promise<ConversationSummary[]> {
  const { data } = await createApi(connection).get<ConversationSummary[]>("/agent/conversations", { signal });
  return data;
}

export async function getConversation(id: string, signal?: AbortSignal): Promise<Conversation> {
  const { data } = await createApi(connection).get<Conversation & { messages: (AgentMessage & { chartData?: unknown; visualization?: unknown })[] }>(`/agent/conversations/${encodeURIComponent(id)}`, { signal });
  return { ...data, messages: data.messages.map((message) => ({ ...message, visualizations: visualizationPayloads(message) })) };
}

export async function getVisualizationPage(conversationId: string, datasetId: string, page: number, signal?: AbortSignal): Promise<{ data: DataRow[]; totalElements: number; hasNext: boolean; refreshed: boolean }> {
  const { data } = await createApi(connection).get(`/agent/conversations/${encodeURIComponent(conversationId)}/datasets/${encodeURIComponent(datasetId)}`, { params: { page, size: 50 }, signal });
  if (data?.datasetId !== datasetId || data?.page !== page || typeof data?.hasNext !== "boolean" || typeof data?.totalElements !== "number") throw new Error("Página de dados inválida.");
  return { data: readRows(data.data), totalElements: data.totalElements, hasNext: data.hasNext, refreshed: data.refreshed === true };
}

export async function askAgent(
  message: string,
  signal?: AbortSignal,
  conversationId?: string,
): Promise<AgentResponse> {
  const { data } = await createApi(connection).post<AgentResponse & { chartData?: unknown; visualization?: unknown }>(
    "/agent/chat",
    { message, ...(conversationId ? { conversationId } : {}) },
    { signal, timeout: 55000 },
  );
  if (typeof data?.response !== "string" || !data.response.trim())
    throw new Error(
      "O assistente retornou uma resposta vazia ou inválida. Tente novamente.",
    );
  return {
    response: data.response,
    visualizations: visualizationPayloads(data),
    conversationId:
      typeof data.conversationId === "string" && data.conversationId.trim()
        ? data.conversationId
        : conversationId,
  };
}
