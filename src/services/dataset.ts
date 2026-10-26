import type { Connection, Dataset } from "../types/api";
import { loadDataCenters } from "./dataCenters";
import { loadIndicators } from "./indicators";
import { loadSources } from "./sources";
import { loadBenefits } from "./benefits";
import { loadResearch } from "./research";
import { loadMapPoints } from "./map";
import { loadDashboard } from "./dashboard";
import { loadDataCenter } from "./dataCenters";
import { loadDataCenterSources } from "./sources";

export async function loadDataset(
  connection: Connection,
  signal?: AbortSignal,
): Promise<Dataset> {
  const [centers, indicators, sources, benefits, research, points, dashboard] =
    await Promise.all([
      loadDataCenters(connection, signal),
      loadIndicators(connection, signal),
      loadSources(connection, signal),
      loadBenefits(connection, signal),
      loadResearch(connection, signal),
      loadMapPoints(connection, signal),
      loadDashboard(connection, signal),
    ]);
  return {
    centers,
    indicators,
    sources,
    benefits,
    research,
    points,
    dashboard,
  };
}
export async function loadDetails(
  connection: Connection,
  id: number,
  signal?: AbortSignal,
) {
  const [center, sources] = await Promise.all([
    loadDataCenter(connection, id, signal),
    loadDataCenterSources(connection, id, signal),
  ]);
  return { center, sources };
}
