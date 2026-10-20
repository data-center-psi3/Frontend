// The raw CSV endpoint returns strings, including numerical fields and dates.
export interface ImportedDataCenter {
  idOriginal: string | null;
  operador: string | null;
  unidade: string | null;
  municipio: string | null;
  uf: string | null;
  codigoIbge: string | null;
  endereco: string | null;
  latitude: string | null;
  longitude: string | null;
  precisaoGeo: string | null;
  tipoInstalacao: string | null;
  statusOperacional: string | null;
  inicioOperacao: string | null;
  potenciaTiMwUnidade: string | null;
  potenciaCampusMw: string | null;
  areaM2Unidade: string | null;
  redesConectadas: string | null;
  ixConectados: string | null;
  carriers: string | null;
  voltadaIa: string | null;
  resfriamento: string | null;
  fonteEnergia: string | null;
  pueDeclarado: string | null;
  wueDeclarado: string | null;
  certificacoes: string | null;
  robustezEvidencia: string | null;
  fonteUrl: string | null;
  dataLevantamento: string | null;
}
export const importColumns = {
  id: "idOriginal",
  operador: "operador",
  unidade: "unidade",
  municipio: "municipio",
  uf: "uf",
  codigo_ibge: "codigoIbge",
  endereco: "endereco",
  latitude: "latitude",
  longitude: "longitude",
  precisao_geo: "precisaoGeo",
  tipo_instalacao: "tipoInstalacao",
  status_operacional: "statusOperacional",
  inicio_operacao: "inicioOperacao",
  potencia_ti_mw_unidade: "potenciaTiMwUnidade",
  potencia_campus_mw: "potenciaCampusMw",
  area_m2_unidade: "areaM2Unidade",
  redes_conectadas: "redesConectadas",
  ix_conectados: "ixConectados",
  carriers: "carriers",
  voltada_ia: "voltadaIa",
  resfriamento: "resfriamento",
  fonte_energia: "fonteEnergia",
  pue_declarado: "pueDeclarado",
  wue_declarado: "wueDeclarado",
  certificacoes: "certificacoes",
  robustez_evidencia: "robustezEvidencia",
  fonte_url: "fonteUrl",
  data_levantamento: "dataLevantamento",
} satisfies Record<string, keyof ImportedDataCenter>;
