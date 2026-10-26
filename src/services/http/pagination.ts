import type { Page } from "../../types/api";
import type { createApi } from "./client";
export async function allPages<T>(
  client: ReturnType<typeof createApi>,
  path: string,
  signal?: AbortSignal,
  sort: string | null = "id,asc",
): Promise<T[]> {
  const items: T[] = [];
  for (let page = 0; ; page++) {
    const { data } = await client.get<Page<T>>(path, {
      params: { page, size: 100, sort: sort ?? undefined },
      signal,
    });
    if (
      !Array.isArray(data.content) ||
      !data.page ||
      !Number.isInteger(data.page.totalPages)
    )
      throw new Error("Resposta paginada incompatível com o contrato da API.");
    items.push(...data.content);
    if (data.page.number + 1 >= data.page.totalPages) return items;
    if (data.page.number !== page)
      throw new Error("A API não avançou a paginação.");
  }
}
