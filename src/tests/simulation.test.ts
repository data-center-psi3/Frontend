import { describe, expect, it } from "vitest";
import { simulateImpact } from "../utils/simulation";

describe("Educational impact simulator", () => {
  it("uses IT energy as the basis for both PUE and site WUE", () => {
    expect(
      simulateImpact({ powerKw: 500, hours: 720, pue: 1.5, wue: 1 }),
    ).toEqual({
      itKwh: 360000,
      totalKwh: 540000,
      overheadKwh: 180000,
      waterLiters: 360000,
      waterM3: 360,
    });
  });
  it("does not inflate water consumption when only PUE changes", () => {
    const a = simulateImpact({ powerKw: 100, hours: 24, pue: 1.2, wue: 2 })!;
    const b = simulateImpact({ powerKw: 100, hours: 24, pue: 2, wue: 2 })!;
    expect(a.totalKwh).toBe(2880);
    expect(a.waterM3).toBe(4.8);
    expect(b.waterM3).toBe(a.waterM3);
    expect(b.totalKwh).toBeGreaterThan(a.totalKwh);
  });
  it("preserves zero and distinguishes omitted water from zero water", () => {
    expect(
      simulateImpact({ powerKw: 0, hours: 24, pue: 1, wue: 0 }),
    ).toMatchObject({ totalKwh: 0, overheadKwh: 0, waterM3: 0 });
    expect(
      simulateImpact({ powerKw: 10, hours: 24, pue: 1, wue: null }),
    ).toMatchObject({ totalKwh: 240, overheadKwh: 0, waterM3: null });
  });
  it("rejects invalid assumptions and numeric overflow", () => {
    const base = { powerKw: 500, hours: 720, pue: 1.5, wue: 1 };
    for (const invalid of [
      { pue: 0.9 },
      { powerKw: -1 },
      { hours: -1 },
      { wue: -1 },
      { powerKw: NaN },
      { wue: Infinity },
      { powerKw: Number.MAX_VALUE },
    ])
      expect(simulateImpact({ ...base, ...invalid })).toBeNull();
  });
});
