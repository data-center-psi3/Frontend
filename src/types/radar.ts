export interface RadarFilters {
  uf: string;
  region: string;
  operator: string;
  installationType: string;
}
export type RadarMetric =
  | "installations"
  | "operators"
  | "networks"
  | "averageNetworks"
  | "ix"
  | "carriers";
export type RadarView = "states" | "heat" | "markers";
export interface RadarConnectivity {
  totalRedesRegistradas: number | null;
  mediaRedesPorInstalacao: number | null;
  totalIxRegistrados: number | null;
  mediaIxPorInstalacao: number | null;
  totalCarriersRegistrados: number | null;
  mediaCarriersPorInstalacao: number | null;
  instalacoesComConectividade: number;
  instalacoesComRedes: number;
  instalacoesComIx: number;
  instalacoesComCarriers: number;
}
export interface RadarOverview {
  totalInstalacoes: number;
  totalOperadores: number;
  totalMunicipios: number;
  totalEstados: number;
  instalacoesComCoordenadas: number;
  totalRedesRegistradas: number | null;
  totalIxRegistrados: number | null;
  totalCarriersRegistrados: number | null;
  conectividade: RadarConnectivity;
}
export interface RadarState extends Omit<RadarOverview, "totalEstados"> {
  uf: string;
  participacaoNacional: number;
  mediaRedesPorInstalacao: number | null;
}
export interface RadarCity {
  municipio: string;
  uf: string;
  codigoIbge: string | null;
  totalInstalacoes: number;
  totalOperadores: number;
  totalRedesRegistradas: number | null;
  totalIxRegistrados: number | null;
  totalCarriersRegistrados: number | null;
  conectividade: RadarConnectivity;
}
export interface RadarOperator {
  operador: string;
  totalInstalacoes: number;
  totalEstados: number;
  totalMunicipios: number;
  totalRedesRegistradas: number | null;
}
export interface RadarPoint {
  /** Optional source identity; negative id is a view key for imported rows, never a legacy API id. */
  sourceId?: string | null;
  sourceUrl?: string | null;
  id: number;
  operador: string | null;
  unidade: string;
  municipio: string;
  uf: string;
  latitude: number | null;
  longitude: number | null;
  precisaoGeo: string | null;
  tipoInstalacao: string | null;
  redesConectadas: number | null;
  ixConectados: number | null;
  carriers: number | null;
}
export interface RadarFilterOptions {
  states: string[];
  operators: string[];
  installationTypes: string[];
  regions: string[];
}
export interface RadarStateDetail {
  uf: string;
  nome: string;
  indicadores: RadarState;
  operadores: RadarOperator[];
  municipios: RadarCity[];
}
