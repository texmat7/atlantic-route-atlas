export type LatLng = { lat: number; lng: number };
export type WavePoint = LatLng & { wave: number };

export const LISBON: LatLng = { lat: 38.7, lng: -9.4 };
export const HALIFAX: LatLng = { lat: 44.55, lng: -63.4 };

const R_NM = 3440.065;
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

export function distanceNm(a: LatLng, b: LatLng) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_NM * Math.asin(Math.sqrt(h));
}

export function routeLengthNm(r: LatLng[]) {
  let d = 0;
  for (let i = 1; i < r.length; i++) d += distanceNm(r[i - 1], r[i]);
  return d;
}

/** Great-circle (orthodromic) route sampled in n segments. */
export function greatCircle(a: LatLng, b: LatLng, n = 40): LatLng[] {
  const φ1 = rad(a.lat), λ1 = rad(a.lng), φ2 = rad(b.lat), λ2 = rad(b.lng);
  const δ = distanceNm(a, b) / R_NM;
  const out: LatLng[] = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const A = Math.sin((1 - f) * δ) / Math.sin(δ);
    const B = Math.sin(f * δ) / Math.sin(δ);
    const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
    const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
    const z = A * Math.sin(φ1) + B * Math.sin(φ2);
    out.push({ lat: deg(Math.atan2(z, Math.hypot(x, y))), lng: deg(Math.atan2(y, x)) });
  }
  return out;
}

/** Inverse-distance-weighted wave height at a point. */
export function waveAt(p: LatLng, grid: WavePoint[]): number {
  let num = 0, den = 0;
  for (const g of grid) {
    const d = Math.hypot(g.lat - p.lat, (g.lng - p.lng) * Math.cos(rad(p.lat)));
    if (d < 0.01) return g.wave;
    if (d > 6) continue;
    const w = 1 / (d * d);
    num += w * g.wave;
    den += w;
  }
  return den ? num / den : 0;
}

/**
 * Weather routing: shifts each waypoint north/south (up to maxShift°) to avoid
 * waves above the threshold, penalising deviation, then smooths the track.
 */
export function weatherRoute(
  base: LatLng[],
  grid: WavePoint[],
  threshold: number,
  maxShift = 5,
): LatLng[] {
  const n = base.length;
  const shifts = base.map((p, i) => {
    if (i === 0 || i === n - 1) return 0;
    let best = 0, bestCost = Infinity;
    for (let s = -maxShift; s <= maxShift; s += 0.5) {
      const w = waveAt({ lat: p.lat + s, lng: p.lng }, grid);
      const cost = Math.max(0, w - threshold) * 10 + w * 0.3 + Math.abs(s) * 0.25;
      if (cost < bestCost) { bestCost = cost; best = s; }
    }
    return best;
  });
  // smooth and taper toward the ports
  let sm = shifts;
  for (let k = 0; k < 8; k++) {
    sm = sm.map((s, i) => (i === 0 || i === n - 1 ? 0 : (sm[i - 1] + 2 * s + sm[i + 1]) / 4));
  }
  return base.map((p, i) => {
    const taper = Math.min(1, Math.min(i, n - 1 - i) / 4);
    return { lat: p.lat + sm[i] * taper, lng: p.lng };
  });
}

export function waveColor(w: number) {
  if (w < 1.5) return "var(--sea-calm)";
  if (w < 3) return "var(--sea-moderate)";
  if (w < 5) return "var(--sea-rough)";
  return "var(--sea-severe)";
}

export async function fetchWaveGrid(): Promise<WavePoint[]> {
  const lats: number[] = [], lngs: number[] = [];
  for (let la = 32; la <= 54; la += 2)
    for (let lo = -70; lo <= -8; lo += 3) { lats.push(la); lngs.push(lo); }
  const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lats.join(",")}&longitude=${lngs.join(",")}&current=wave_height`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Dati meteo-marini non disponibili (${res.status})`);
  const data = await res.json();
  const arr = Array.isArray(data) ? data : [data];
  return arr
    .map((d: any, i: number) => ({ lat: lats[i], lng: lngs[i], wave: d?.current?.wave_height }))
    .filter((p: any) => typeof p.wave === "number");
}
