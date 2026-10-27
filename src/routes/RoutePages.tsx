import { lazy } from "react";
import { useOutletContext } from "react-router-dom";
import { connection } from "../config/connection";
import type { AppOutletContext } from "../types/routes";

const Dashboard = lazy(() =>
  import("../pages/Dashboard").then((m) => ({ default: m.Dashboard })),
);
const Indicators = lazy(() =>
  import("../pages/Indicators").then((m) => ({ default: m.Indicators })),
);
const Comparison = lazy(() =>
  import("../pages/Comparison").then((m) => ({ default: m.Comparison })),
);
const MapPage = lazy(() =>
  import("../pages/Map").then((m) => ({ default: m.MapPage })),
);
const RadarPage = lazy(() =>
  import("../pages/Radar/RadarPage").then((m) => ({ default: m.RadarPage })),
);
const Benefits = lazy(() =>
  import("../pages/Content").then((m) => ({ default: m.Benefits })),
);
const News = lazy(() =>
  import("../pages/News").then((m) => ({ default: m.News })),
);
const Sources = lazy(() =>
  import("../pages/Content").then((m) => ({ default: m.Sources })),
);
const About = lazy(() =>
  import("../pages/Content").then((m) => ({ default: m.About })),
);
const Learning = lazy(() =>
  import("../pages/Learning").then((m) => ({ default: m.Learning })),
);
const Agent = lazy(() =>
  import("../pages/Agent").then((m) => ({ default: m.Agent })),
);
export function AgentRoute() {
  return <Agent />;
}
export function DashboardRoute() {
  const props = useOutletContext<AppOutletContext>();
  return <Dashboard {...props} />;
}
export function IndicatorsRoute() {
  const props = useOutletContext<AppOutletContext>();
  return <Indicators {...props} />;
}
export function ComparisonRoute() {
  const props = useOutletContext<AppOutletContext>();
  return <Comparison {...props} />;
}
export function BenefitsRoute() {
  const props = useOutletContext<AppOutletContext>();
  return <Benefits {...props} />;
}

export function NewsRoute() {
  return <News connection={connection} />;
}
export function SourcesRoute() {
  const props = useOutletContext<AppOutletContext>();
  return <Sources {...props} />;
}
export function AboutRoute() {
  const props = useOutletContext<AppOutletContext>();
  return <About {...props} />;
}

export function MapRoute() {
  const props = useOutletContext<AppOutletContext>();
  return (
    <MapPage
      {...props}
      mode="real"
      connection={connection}
      connectionVersion={0}
      ensureLocations={props.ensureLocations}
    />
  );
}
export function RadarRoute() {
  return <RadarPage connection={connection} />;
}
export function LearningRoute() {
  return <Learning />;
}
