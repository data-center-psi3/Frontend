export interface DataCenter {
  id: number;
  nome: string;
  empresa: string | null;
  cidade: string;
  estado: string;
  pais: string;
  latitude: number | null;
  longitude: number | null;
  descricao: string | null;
  potenciaMw: number | null;
  areaM2: number | null;
  tipoInstalacao: string | null;
  statusValidacao: string | null;
  dataValidacao: string | null;
}
export type MapPoint = Pick<
  DataCenter,
  | "id"
  | "nome"
  | "empresa"
  | "cidade"
  | "estado"
  | "latitude"
  | "longitude"
  | "potenciaMw"
  | "tipoInstalacao"
>;
export interface Indicator {
  id: number;
  dataCenterId: number;
  tipo: string;
  valor: number | null;
  unidade: string | null;
  periodo: string | null;
  fonteId: number | null;
  observacoes: string | null;
}
export interface Source {
  id: number;
  instituicao: string;
  titulo: string;
  url: string | null;
  dataPublicacao: string | null;
  dataConsulta: string;
}
export interface Benefit {
  id: number;
  dataCenterId: number;
  tipo: string;
  descricao: string;
  fonteId: number | null;
}
export interface Research {
  id: number;
  dataCenterId: number | null;
  titulo: string;
  conteudo: string;
  categoria: string | null;
  fonteId: number;
  dataPublicacao: string | null;
}
export interface CitySummary {
  cidade: string;
  quantidadeDataCenters: number;
  potenciaTotalMw: number;
}
export interface Page<T> {
  content: T[];
  page: {
    size: number;
    number: number;
    totalElements: number;
    totalPages: number;
  };
}
export interface Dataset {
  centers: DataCenter[];
  indicators: Indicator[];
  sources: Source[];
  benefits: Benefit[];
  research: Research[];
  points: MapPoint[];
  dashboard: CitySummary[];
}
export interface Connection {
  baseUrl: string;
  username: string;
  password: string;
}
export interface Filters {
  indicator?: string;
  country: string;
  state: string;
  city: string;
  center: string;
  period: string;
  search: string;
}
