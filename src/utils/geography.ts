import { displayValue, normalize, isMissing } from "./data";

const stateNames: Record<string, string> = {
  AC: "Acre",
  AL: "Alagoas",
  AP: "Amapá",
  AM: "Amazonas",
  BA: "Bahia",
  CE: "Ceará",
  DF: "Distrito Federal",
  ES: "Espírito Santo",
  GO: "Goiás",
  MA: "Maranhão",
  MT: "Mato Grosso",
  MS: "Mato Grosso do Sul",
  MG: "Minas Gerais",
  PA: "Pará",
  PB: "Paraíba",
  PR: "Paraná",
  PE: "Pernambuco",
  PI: "Piauí",
  RJ: "Rio de Janeiro",
  RN: "Rio Grande do Norte",
  RS: "Rio Grande do Sul",
  RO: "Rondônia",
  RR: "Roraima",
  SC: "Santa Catarina",
  SP: "São Paulo",
  SE: "Sergipe",
  TO: "Tocantins",
};
export function stateKey(value: string) {
  const code = value?.trim().toUpperCase() ?? "";
  return (
    Object.entries(stateNames).find(
      ([, name]) => normalize(name) === normalize(code),
    )?.[0] ?? code
  );
}
export function stateName(value: string) {
  return stateNames[stateKey(value)] ?? displayValue(value);
}
export function geographicGroups<T extends { cidade: string; estado: string }>(
  records: T[],
) {
  const states = new Map<
    string,
    {
      key: string;
      name: string;
      count: number;
      cities: Map<
        string,
        {
          key: string;
          name: string;
          state: string;
          count: number;
          records: T[];
        }
      >;
    }
  >();
  records.forEach((record) => {
    const key = stateKey(record.estado);
    let state = states.get(key);
    if (!state) {
      state = {
        key,
        name: stateName(record.estado),
        count: 0,
        cities: new Map(),
      };
      states.set(key, state);
    }
    state.count++;
    const cityKey = `${key}/${normalize(record.cidade?.trim() ?? "")}`;
    let city = state.cities.get(cityKey);
    if (!city) {
      city = {
        key: cityKey,
        name: displayValue(record.cidade),
        state: key,
        count: 0,
        records: [],
      };
      state.cities.set(cityKey, city);
    }
    city.count++;
    city.records.push(record);
  });
  const rank = (
    a: { count: number; name: string },
    b: { count: number; name: string },
  ) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR");
  return [...states.values()].sort(rank).map((state) => ({
    ...state,
    cities: [...state.cities.values()].sort(rank),
  }));
}

/** Unknown names remain an explicit bucket, never an invented operator. */
export function operatorGroups<T>(
  records: T[],
  getOperator: (record: T) => string | null | undefined,
) {
  const groups = new Map<
    string,
    { key: string; name: string; known: boolean; records: T[]; count: number }
  >();
  for (const record of records) {
    const raw = getOperator(record);
    const name = typeof raw === "string" ? raw.replace(/\s+/g, " ").trim() : "";
    const known =
      !isMissing(name) &&
      !["desconhecido", "nao informado na base"].includes(normalize(name));
    const key = JSON.stringify(
      known ? ["operator", normalize(name)] : ["unknown"],
    );
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        name: known ? name : "Operador não informado",
        known,
        records: [],
        count: 0,
      };
      groups.set(key, group);
    }
    group.records.push(record);
    group.count++;
  }
  return [...groups.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR"),
  );
}
