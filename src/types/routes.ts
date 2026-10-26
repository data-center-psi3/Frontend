import type { ViewProps } from "../pages/Dashboard";

export type AppOutletContext = ViewProps & {
  ensureLocations: () => Promise<void>;
};
