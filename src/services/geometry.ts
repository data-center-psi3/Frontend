import type { FeatureCollection } from "geojson";
import { ufCodes } from "../utils/radar";

export async function loadRadarGeometry(signal?: AbortSignal) {
  const response = await fetch(
    `${import.meta.env.BASE_URL}geo/br-states.geojson`,
    { signal },
  );
  if (!response.ok)
    throw new Error("Não foi possível carregar os limites estaduais do IBGE.");
  const collection = (await response.json()) as FeatureCollection;
  if (
    collection.type !== "FeatureCollection" ||
    !Array.isArray(collection.features) ||
    collection.features.length !== 27
  )
    throw new Error("Malha estadual inválida.");
  collection.features.forEach((feature) => {
    const uf = ufCodes[String(feature.properties?.codarea)];
    if (!uf) throw new Error("UF não identificada na malha.");
    feature.properties = { ...feature.properties, uf };
  });
  return collection;
}
