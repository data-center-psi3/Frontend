import { connection } from "../config/connection";
import { createApi } from "./http/client";

export async function askAgent(message: string, signal?: AbortSignal) {
  const { data } = await createApi(connection).post<{ response: string }>(
    "/agent/chat",
    { message },
    { signal, timeout: 55000 },
  );
  if (typeof data?.response !== "string" || !data.response.trim())
    throw new Error(
      "O assistente retornou uma resposta vazia ou inválida. Tente novamente.",
    );
  return data.response;
}
