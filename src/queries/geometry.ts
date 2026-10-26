import { useQuery } from "@tanstack/react-query";
import { loadRadarGeometry } from "../services/geometry";

export function useRadarGeometry() {
  return useQuery({
    queryKey: ["radar", "ibge-geometry"],
    staleTime: Infinity,
    queryFn: ({ signal }) => loadRadarGeometry(signal),
  });
}
