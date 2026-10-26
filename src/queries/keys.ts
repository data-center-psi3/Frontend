import type { Connection } from "../types/api";

// Credentials stay out of cache keys. Each credential set gets an in-memory identity.
const identities = new Map<string, number>();
export function connectionKey(connection: Connection | null) {
  if (!connection) return null;
  const identity = JSON.stringify([
    connection.baseUrl.replace(/\/+$/, ""),
    connection.username,
    connection.password,
  ]);
  if (!identities.has(identity)) identities.set(identity, identities.size + 1);
  return identities.get(identity)!;
}
