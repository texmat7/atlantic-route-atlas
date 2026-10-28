import { useEffect, useRef } from "react";
import type { LatLng, WavePoint } from "@/lib/routing";
import { LISBON, HALIFAX, waveColor } from "@/lib/routing";

type Props = { grid: WavePoint[]; planned: LatLng[]; rerouted: LatLng[]; show: { planned: boolean; optimized: boolean } };

const css = (v: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(v.replace(/var\((.*)\)/, "$1")).trim();

export function AtlasMap({ grid, planned, rerouted, show }: Props) {
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
      const map = L.map(el.current, { worldCopyJump: true, minZoom: 2 }).setView([42, -36], 4);
      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}", {
        attribution: "Tiles &copy; Esri · Onde: Open-Meteo",
      }).addTo(map);
      mapRef.current = map;
      layerRef.current = L.layerGroup().addTo(map);
      draw();
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { draw(); }, [grid, planned, rerouted, show]);

  function draw() {
    const L = LRef.current, layer = layerRef.current;
    if (!L || !layer) return;
    layer.clearLayers();
    grid.forEach((g) =>
      L.circleMarker([g.lat, g.lng], {
        radius: 6 + g.wave * 2.2, stroke: false, fillColor: css(waveColor(g.wave)), fillOpacity: 0.35,
      }).bindTooltip(`Onda ${g.wave.toFixed(1)} m`).addTo(layer),
    );
    if (show.planned)
      L.polyline(planned.map((p) => [p.lat, p.lng]), {
        color: css("--route-planned"), weight: 2, dashArray: "6 6",
      }).bindTooltip("Rotta pianificata (ortodromia)").addTo(layer);
    if (show.optimized)
      L.polyline(rerouted.map((p) => [p.lat, p.lng]), {
        color: css("--route-weather"), weight: 3.5,
      }).bindTooltip("Rotta meteo-ottimizzata").addTo(layer);
    [[LISBON, "Lisbona"], [HALIFAX, "Halifax"]].forEach(([p, n]: any) =>
      L.circleMarker([p.lat, p.lng], { radius: 7, color: css("--foreground"), fillColor: css("--primary"), fillOpacity: 1, weight: 2 })
        .bindTooltip(n, { permanent: true, direction: "top", className: "port-label" }).addTo(layer),
    );
  }

  return <div ref={el} className="h-full w-full" />;
}
