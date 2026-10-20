import type { Dataset } from "../types/api";
// All installations, environmental values and references here are synthetic.
const locations = [
  ["Campinas", "SP", -22.9056, -47.0608],
  ["Hortolândia", "SP", -22.8583, -47.22],
  ["São Paulo", "SP", -23.5505, -46.6333],
  ["Rio de Janeiro", "RJ", -22.9068, -43.1729],
  ["Fortaleza", "CE", -3.7319, -38.5267],
  ["Porto Alegre", "RS", -30.0346, -51.2177],
  ["Brasília", "DF", -15.7939, -47.8828],
  ["Curitiba", "PR", -25.4284, -49.2733],
] as const;
const centers = locations.map(
  ([cidade, estado, latitude, longitude], index) => ({
    id: index + 1,
    nome: `Instalação demonstrativa ${String(index + 1).padStart(2, "0")}`,
    empresa: "Operador fictício",
    cidade,
    estado,
    pais: "Brasil",
    latitude,
    longitude,
    descricao:
      "Instalação fictícia para explorar as funcionalidades. Não representa um data center real.",
    potenciaMw: index === 7 ? null : 12 + index * 7,
    areaM2: null,
    tipoInstalacao: "Demonstração",
    statusValidacao: "FICTÍCIO",
    dataValidacao: null,
  }),
);
const indicators = centers.flatMap((c) =>
  ["2023", "2024", "2025"].flatMap((periodo, year) =>
    [
      {
        tipo: "Consumo de energia",
        valor: 4200 + c.id * 930 + year * 420,
        unidade: "MWh",
      },
      {
        tipo: "Consumo de água",
        valor: 3800 + c.id * 610 + year * 130,
        unidade: "m³",
      },
      {
        tipo: "Emissões de GEE",
        valor: 130 + c.id * 21 + year * 9,
        unidade: "tCO₂e",
      },
      {
        tipo: "Resíduos eletroeletrônicos",
        valor: 2 + c.id * 0.7,
        unidade: "t",
      },
      { tipo: "PUE", valor: 1.25 + c.id * 0.025, unidade: "índice" },
    ].map((v, i) => ({
      ...v,
      id: c.id * 100 + year * 10 + i,
      dataCenterId: c.id,
      periodo,
      fonteId: 1,
      observacoes:
        "Valor fictício, criado exclusivamente para demonstração da interface.",
    })),
  ),
);
export const demo: Dataset = {
  centers,
  indicators,
  points: centers,
  sources: [
    {
      id: 1,
      instituicao: "Referência demonstrativa",
      titulo: "Conjunto sintético para demonstração — sem publicação acadêmica",
      url: null,
      dataPublicacao: null,
      dataConsulta: "2026-10-14",
    },
  ],
  benefits: centers.map((c) => ({
    id: c.id,
    dataCenterId: c.id,
    tipo: [
      "Infraestrutura digital",
      "Computação em nuvem",
      "Benefícios sociais e econômicos",
    ][c.id % 3],
    descricao:
      "Exemplo fictício de um benefício cadastrado: suporte a serviços digitais e à conectividade regional.",
    fonteId: 1,
  })),
  research: [],
  dashboard: centers.map((c) => ({
    cidade: c.cidade,
    quantidadeDataCenters: 1,
    potenciaTotalMw: c.potenciaMw ?? 0,
  })),
};
