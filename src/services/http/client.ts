import axios from "axios";
import type { Connection } from "../../types/api";
export function createApi(connection: Connection) {
  const baseURL = connection.baseUrl.replace(/\/+$/, "");
  return axios.create({
    baseURL: baseURL.endsWith("/api") ? baseURL : `${baseURL}/api`,
    timeout: 20000,
    auth: connection.username
      ? { username: connection.username, password: connection.password }
      : undefined,
    headers: { Accept: "application/json, application/problem+json" },
  });
}
