import { useEffect, useRef } from "react";
import type { LatLng, WavePoint } from "@/lib/routing";
import { LISBON, HALIFAX, waveColor } from "@/lib/routing";
import type { SegmentResult } from "@/lib/simulation";

type Show = { planned: boolean; optimized: boolean; adv: boolean; waves: boolean };
type Props = { grid: WavePoint[]; planned: LatLng[]; rerouted: LatLng[]; segments: SegmentResult[]; show: Show };

const css = (v: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(v.replace(/var\((.*)\)/, "$1")).trim();

const advColor = (a: number) =>
  a < 0.25 ? "--sea-severe" : a < 0.45 ? "--sea-rough" : a < 0.65 ? "--sea-moderate" : "--sea-calm";

export function AtlasMap({ grid, planned, rerouted, segments, show }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const LRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    import("leaflet").then((mod) => {
      const L = (mod as any).default ?? mod;
      if (cancelled || !el.current || mapRef.current) return;
      LRef.current = L;
      const map = L.map(el.current, { worldCopyJump: true, minZoom: 2 }).setView([43, -36], 4);
      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}", {
        attribution: "Tiles &copy; Esri · Waves: Open-Meteo · ADV: simulated",
      }).addTo(map);
      mapRef.current = map;
      layerRef.current = L.layerGroup().addTo(map);
      draw();
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { draw(); }, [grid, planned, rerouted, segments, show]);

  function draw() {
    const L = LRef.current, layer = layerRef.current;
    if (!L || !layer) return;
    layer.clearLayers();
    if (show.waves)
      grid.forEach((g) =>
        L.circleMarker([g.lat, g.lng], {
          radius: 6 + g.wave * 2.2, stroke: false, fillColor: css(waveColor(g.wave)), fillOpacity: 0.3,
        }).bindTooltip(`Hs ${g.wave.toFixed(1)} m`).addTo(layer),
      );
    if (show.adv)
      for (let i = 1; i < segments.length; i++) {
        const a = segments[i - 1]!, b = segments[i]!;
        L.polyline([[a.lat, a.lng], [b.lat, b.lng]], {
          color: css(advColor(b.adv)), weight: 12, opacity: 0.55, lineCap: "butt",
        }).bindTooltip(
          `<b>WP ${b.idx}</b>${b.blind ? " · BLIND CORRIDOR" : ""}<br/>ADV ${b.adv.toFixed(2)}<br/>P(coinc.) S1 ${(b.pS1 * 100).toFixed(0)}% · all ${(b.pAll * 100).toFixed(0)}%<br/>Forecast bias −${b.bias.toFixed(1)} m`,
        ).addTo(layer);
      }
    if (show.planned)
      L.polyline(planned.map((p) => [p.lat, p.lng]), { color: css("--route-planned"), weight: 2, dashArray: "6 6" })
        .bindTooltip("Planned route (great circle)").addTo(layer);
    if (show.optimized)
      L.polyline(rerouted.map((p) => [p.lat, p.lng]), { color: css("--route-weather"), weight: 3.5 })
        .bindTooltip("Satellite-informed re-route").addTo(layer);
    [[LISBON, "Lisbon"], [HALIFAX, "Halifax"]].forEach(([p, n]: any) =>
      L.circleMarker([p.lat, p.lng], { radius: 7, color: css("--foreground"), fillColor: css("--primary"), fillOpacity: 1, weight: 2 })
        .bindTooltip(n, { permanent: true, direction: "top", className: "port-label" }).addTo(layer),
    );
  }

  return <div ref={el} className="h-full w-full" />;
}
