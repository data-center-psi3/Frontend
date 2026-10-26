import { describe, expect, it } from "vitest";
import { connectionKey } from "../queries/keys";
import { datasetQueryOptions } from "../queries/dataset";

const connection = { baseUrl: "/api", username: "reader", password: "private" };

describe("connection cache isolation", () => {
  it("reuses cache identity for equivalent connection values", () => {
    expect(connectionKey({ ...connection, baseUrl: "/api/" })).toBe(
      connectionKey(connection),
    );
    expect(datasetQueryOptions({ ...connection }).queryKey).toEqual(
      datasetQueryOptions(connection).queryKey,
    );
  });
  it("isolates changed endpoints and credentials without exposing passwords in keys", () => {
    for (const changed of [
      { baseUrl: "/other" },
      { username: "other" },
      { password: "other-secret" },
    ]) {
      expect(connectionKey({ ...connection, ...changed })).not.toBe(
        connectionKey(connection),
      );
    }
    expect(
      JSON.stringify(datasetQueryOptions(connection).queryKey),
    ).not.toContain(connection.password);
    expect(connectionKey(null)).toBeNull();
  });
});
