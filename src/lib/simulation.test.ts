import { describe, it, expect } from "vitest";
import { economics, ECON_DEFAULTS } from "./simulation";

describe("Module E economics", () => {
  it("cost = warned hazards × fuel penalty × fuel price", () => {
    const r = economics({ ...ECON_DEFAULTS, fleetSize: 1, transitsPerVessel: 10, hazardsPerTransit: 1, warnedShare: 0.5, fuelPenaltyT: 10, fuelPrice: 600 });
    expect(r.warned).toBe(5);
    expect(r.cost).toBe(30000);
  });
  it("break-even damage probability = fuel cost per avoidance / avg loss", () => {
    const r = economics({ ...ECON_DEFAULTS, fuelPenaltyT: 10, fuelPrice: 500, avgLoss: 1_000_000 });
    expect(r.breakEvenProb).toBeCloseTo(0.005);
  });
});
