export const apiRoutes = {
  dataCenters: "/data-centers",
  dataCenter: (id: number) => `/data-centers/${id}`,
  dataCenterSources: (id: number) => `/data-centers/${id}/fontes`,
  indicators: "/indicadores-ambientais",
  sources: "/fontes",
  benefits: "/beneficios",
  research: "/conteudos-pesquisa",
  map: "/mapa",
  dashboard: "/dashboard",
  imports: "/importacoes",
  radar: {
    overview: "/radar/overview",
    states: "/radar/states",
    state: (uf: string) => `/radar/states/${encodeURIComponent(uf)}`,
    cities: (uf: string) => `/radar/states/${encodeURIComponent(uf)}/cities`,
    operators: "/radar/operators/ranking",
    cityRanking: "/radar/cities/ranking",
    points: "/radar/map",
    filters: "/radar/filters",
  },
  news: "/news"
} as const;
