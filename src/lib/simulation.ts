/**
 * SIMULATED project results (placeholder until the Python pipeline feeds real data).
 * Shapes mirror the project outputs: coincidence probability (H1/H2),
 * forecast bias (H3), re-routing cost/benefit (H4) and the ADV atlas.
 */
import type { LatLng } from "./routing";

export type SegmentResult = LatLng & {
  idx: number;
  pS1: number; // coincidence probability, Sentinel-1 only
  pAll: number; // full open constellation (SAR + altimetry)
  bias: number; // CMEMS Hs underestimation (m) on coincident events
  adv: number; // Added Detection Value score 0..1
  blind: boolean;
};

const rnd = (i: number) => {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

export function simulateSegments(route: LatLng[]): SegmentResult[] {
  return route.map((p, i) => {
    // Grand Banks / Flemish Cap approach (west of ~45°W) has dense SAR tasking
    const gb = Math.max(0, Math.min(1, (-p.lng - 42) / 14));
    const coast = Math.max(0, 1 - Math.abs(p.lng + 9.4) / 6) * 0.5;
    const pS1 = 0.03 + 0.17 * gb + 0.06 * coast + 0.02 * rnd(i);
    const pAll = Math.min(0.95, pS1 * 2.6 + 0.08 + 0.04 * rnd(i + 7));
    const bias = 0.4 + 1.1 * (1 - gb) * (0.6 + 0.4 * rnd(i + 3));
    const adv = Math.min(1, pAll * 1.6 * (0.5 + bias / 3));
    return { ...p, idx: i, pS1, pAll, bias, adv, blind: pAll < 0.22 };
  });
}

export const VESSEL = {
  name: "4250 TEU containership",
  lbp: 244.8,
  dwt: 50829,
  speedKn: 24.5,
  heaveMax: 3.5,
  rollMax: 5,
};

/** H4 simulated re-routing events: safety margin recovered vs fuel penalty. */
export function simulateEvents(n = 24) {
  return Array.from({ length: n }, (_, i) => {
    const heaveBefore = 3.6 + rnd(i + 11) * 1.6;
    const heaveAfter = Math.min(heaveBefore - 0.4, 2.6 + rnd(i + 19) * 0.9);
    const fuelPenaltyT = +(2 + rnd(i + 23) * 14).toFixed(1);
    return { id: i + 1, heaveBefore: +heaveBefore.toFixed(2), heaveAfter: +heaveAfter.toFixed(2), fuelPenaltyT };
  });
}

/* ---------- Module E: economic framing ---------- */
export type EconInputs = {
  fleetSize: number; // vessels
  transitsPerVessel: number; // per year
  hazardsPerTransit: number; // hazardous encounters per transit
  warnedShare: number; // share of hazards a satellite pass catches (0..1)
  fuelPenaltyT: number; // extra fuel per avoidance (t)
  fuelPrice: number; // USD / t
  damageProb: number; // P(damage | unwarned hazard)
  avgLoss: number; // USD per damage incident (cargo + hull + delay)
};

export function economics(e: EconInputs) {
  const hazards = e.fleetSize * e.transitsPerVessel * e.hazardsPerTransit;
  const warned = hazards * e.warnedShare;
  const cost = warned * e.fuelPenaltyT * e.fuelPrice;
  const avoidedLoss = warned * e.damageProb * e.avgLoss;
  const net = avoidedLoss - cost;
  const breakEvenProb = (e.fuelPenaltyT * e.fuelPrice) / e.avgLoss;
  return { hazards, warned, cost, avoidedLoss, net, roi: cost ? net / cost : 0, breakEvenProb };
}

export const ECON_DEFAULTS: EconInputs = {
  fleetSize: 20,
  transitsPerVessel: 18,
  hazardsPerTransit: 0.6,
  warnedShare: 0.35,
  fuelPenaltyT: 8,
  fuelPrice: 620,
  damageProb: 0.02,
  avgLoss: 2_500_000,
};
