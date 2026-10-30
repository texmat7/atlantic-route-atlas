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

import segData from "@/data/segments.json";
import eventData from "@/data/events.json";

const maxPAll = Math.max(...segData.map((d) => d.pAll));

/** Real per-route-node results from the Python pipeline (coincidence_merged.parquet, 2010–2020).
 *  ADV = all-mission coincidence probability normalised to the best-covered node. */
export function simulateSegments(_route?: LatLng[]): SegmentResult[] {
  return segData.map((d) => ({
    lat: d.lat, lng: d.lng, idx: d.idx, pS1: d.pS1, pAll: d.pAll, bias: d.bias,
    adv: d.pAll / maxPAll, blind: d.pAll < 0.22,
  }));
}

/** Pipeline route nodes (Lisbon → Halifax). */
export const PIPELINE_ROUTE: LatLng[] = segData.map((d) => ({ lat: d.lat, lng: d.lng }));
export const PIPELINE_EVENT_COUNT = segData.reduce((a, d) => a + d.n, 0);

export const VESSEL = {
  name: "4250 TEU containership",
  lbp: 244.8,
  dwt: 50829,
  speedKn: 24.5,
  heaveMax: 3.5,
  rollMax: 5,
};

/** Re-routing results per year (phase4_adv_dataset.csv, joined by event_id). id = year. */
export function simulateEvents() {
  return eventData.map((e) => ({
    id: e.id, heaveBefore: +e.heaveBefore.toFixed(2), heaveAfter: +e.heaveAfter.toFixed(2),
    fuelPenaltyT: +e.fuelPenaltyT.toFixed(1), restored: e.restored,
  }));
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
