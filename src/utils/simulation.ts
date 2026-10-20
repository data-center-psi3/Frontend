export interface ImpactScenario {
  powerKw: number;
  pue: number;
  hours: number;
  wue: number | null;
}
export function simulateImpact({ powerKw, pue, hours, wue }: ImpactScenario) {
  if (
    ![powerKw, pue, hours].every(Number.isFinite) ||
    powerKw < 0 ||
    pue < 1 ||
    hours < 0 ||
    (wue !== null && (!Number.isFinite(wue) || wue < 0))
  )
    return null;
  const itKwh = powerKw * hours;
  const totalKwh = itKwh * pue;
  const overheadKwh = totalKwh - itKwh;
  const waterLiters = wue === null ? null : itKwh * wue;
  if (
    ![itKwh, totalKwh, overheadKwh].every(Number.isFinite) ||
    (waterLiters !== null && !Number.isFinite(waterLiters))
  )
    return null;
  return {
    itKwh,
    totalKwh,
    overheadKwh,
    waterLiters,
    waterM3: waterLiters === null ? null : waterLiters / 1000,
  };
}
