import { Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/layout/AppLayout";
import { NotFound } from "./pages/NotFound";
import {
  DashboardRoute,
  IndicatorsRoute,
  ComparisonRoute,
  MapRoute,
  RadarRoute,
  BenefitsRoute,
  SourcesRoute,
  AboutRoute,
  LearningRoute,
  NewsRoute,
  AgentRoute,
} from "./routes/RoutePages";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardRoute />} />
        <Route path="dashboard" element={<DashboardRoute />} />
        <Route path="indicadores" element={<IndicatorsRoute />} />
        <Route path="mapa" element={<MapRoute />} />
        <Route path="radar" element={<RadarRoute />} />
        <Route path="radar/estado/:uf" element={<RadarRoute />} />
        <Route path="comparacao" element={<ComparisonRoute />} />
        <Route path="beneficios" element={<BenefitsRoute />} />
        <Route path="noticias" element={<NewsRoute />} />
        <Route path="assistente" element={<AgentRoute />} />
        <Route path="fontes" element={<SourcesRoute />} />
        <Route path="sobre" element={<AboutRoute />} />
        <Route path="por-dentro" element={<LearningRoute />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
