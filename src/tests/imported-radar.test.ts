import { describe, it, expect } from "vitest";
import {
  importedCoordinate,
  importedCount,
  importedRadarModel,
} from "../adapters/importedRadar";
import type { ImportedDataCenter } from "../types/imports";
const all = { uf: "", region: "", operator: "", installationType: "" };
const row = (values: Partial<ImportedDataCenter>): ImportedDataCenter => ({
  idOriginal: null,
  operador: null,
  unidade: null,
  municipio: null,
  uf: null,
  codigoIbge: null,
  endereco: null,
  latitude: null,
  longitude: null,
  precisaoGeo: null,
  tipoInstalacao: null,
  statusOperacional: null,
  inicioOperacao: null,
  potenciaTiMwUnidade: null,
  potenciaCampusMw: null,
  areaM2Unidade: null,
  redesConectadas: null,
  ixConectados: null,
  carriers: null,
  voltadaIa: null,
  resfriamento: null,
  fonteEnergia: null,
  pueDeclarado: null,
  wueDeclarado: null,
  certificacoes: null,
  robustezEvidencia: null,
  fonteUrl: null,
  dataLevantamento: null,
  ...values,
});
describe("Populated import API adapter", () => {
  it("parses decimal commas without converting missing coordinates or connectivity to zero", () => {
    expect(importedCoordinate(" -16,378557 ")).toBe(-16.378557);
    expect(importedCoordinate("0")).toBe(0);
    expect(importedCoordinate("-39.588659")).toBe(-39.588659);
    for (const value of [null, "", "—", "N/A", "12,34,56", "1e3"])
      expect(importedCoordinate(value)).toBeNull();
    expect(importedCount(" 0 ")).toBe(0);
    expect(importedCount("43")).toBe(43);
    for (const value of [
      null,
      "—",
      "1,5",
      "1.000",
      "-1",
      "12 redes",
      "9007199254740993",
    ])
      expect(importedCount(value)).toBeNull();
  });
  it("reconciles totals, map coverage, all rows, distinct operators and partial connectivity", async () => {
    const model = importedRadarModel([
      row({
        idOriginal: "external-a",
        unidade: "Unidade A",
        uf: "SP",
        municipio: "Campinas",
        codigoIbge: "3509502",
        operador: " Órbita  Digital ",
        latitude: "-22,9",
        longitude: "-47,0",
        redesConectadas: "10",
        ixConectados: "0",
      }),
      row({
        idOriginal: "external-b",
        uf: "sp",
        municipio: "CAMPINAS",
        codigoIbge: "3509502",
        operador: "orbita digital",
        redesConectadas: "0",
        ixConectados: "—",
      }),
      row({
        uf: "RJ",
        municipio: "Campinas",
        operador: "Outro",
        latitude: "0",
        longitude: "0",
        redesConectadas: "—",
      }),
      row({ uf: "XX", latitude: "10", longitude: "10" }),
    ]);
    const overview = await model.service.overview(all);
    expect(overview).toMatchObject({
      totalInstalacoes: 3,
      totalOperadores: 2,
      totalMunicipios: 2,
      totalEstados: 2,
      instalacoesComCoordenadas: 2,
      totalRedesRegistradas: 10,
      totalIxRegistrados: 0,
      totalCarriersRegistrados: null,
    });
    expect(overview.conectividade).toMatchObject({
      mediaRedesPorInstalacao: 5,
      instalacoesComRedes: 2,
      instalacoesComIx: 1,
      instalacoesComCarriers: 0,
    });
    expect(model.excludedRows).toBe(1);
    expect(model.records(all)).toHaveLength(3);
    const points = await model.service.points(all);
    expect(points).toHaveLength(2);
    expect(points[0]).toMatchObject({
      sourceId: "external-a",
      latitude: -22.9,
      longitude: -47,
    });
    expect(points[0].id).toBeLessThan(0);
    const detail = await model.service.state("SP", all);
    expect(detail.indicadores.totalInstalacoes).toBe(2);
    expect(detail.indicadores.participacaoNacional).toBe(66.67);
    expect(detail.municipios).toHaveLength(1);
  });
  it("applies normalized AND filters and preserves national denominator and unknown sums", async () => {
    const model = importedRadarModel([
      row({
        uf: "SP",
        municipio: "A",
        operador: " Operador Á ",
        tipoInstalacao: "Colocation",
        redesConectadas: "4",
      }),
      row({
        uf: "SP",
        municipio: "B",
        operador: "Operador B",
        tipoInstalacao: "Colocation",
      }),
      row({
        uf: "CE",
        municipio: "C",
        operador: "Operador A",
        tipoInstalacao: "Campus",
      }),
    ]);
    const filters = {
      ...all,
      uf: "SP",
      region: "sudeste",
      operator: "operador a",
      installationType: "colocation",
    };
    expect((await model.service.overview(filters)).totalInstalacoes).toBe(1);
    expect(
      (await model.service.state("SP", filters)).indicadores
        .participacaoNacional,
    ).toBe(33.33);
    expect(
      (await model.service.overview({ ...filters, region: "Nordeste" }))
        .totalInstalacoes,
    ).toBe(0);
    expect(
      (await model.service.overview({ ...all, operator: "Operador B" }))
        .totalRedesRegistradas,
    ).toBeNull();
    expect(await model.service.filters()).toMatchObject({
      states: ["CE", "SP"],
      operators: ["Operador Á", "Operador B"],
      installationTypes: ["Campus", "Colocation"],
    });
  });
  it("does not fabricate observations for an empty import collection", async () => {
    const service = importedRadarModel([]).service;
    expect(await service.points(all)).toEqual([]);
    expect(await service.states(all, "installations")).toEqual([]);
    expect(await service.overview(all)).toMatchObject({
      totalInstalacoes: 0,
      totalRedesRegistradas: null,
    });
  });
});
