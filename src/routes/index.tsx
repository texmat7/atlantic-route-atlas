import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Line, LineChart, CartesianGrid, XAxis, YAxis, ReferenceLine, Tooltip, ResponsiveContainer } from "recharts";
import { Slider } from "@/components/ui/slider";
import { AtlasMap } from "@/components/AtlasMap";
import {
  fetchWaveGrid, greatCircle, weatherRoute, routeLengthNm, waveAt, LISBON, HALIFAX, type WavePoint,
} from "@/lib/routing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Atlas Marino · Lisbona → Halifax" },
      { name: "description", content: "Atlante mondiale con rotta Lisbona–Halifax e deviazioni dovute all'altezza d'onda." },
      { property: "og:title", content: "Atlas Marino · Lisbona → Halifax" },
      { property: "og:description", content: "Rotta transatlantica e weather routing in base all'altezza d'onda." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const SPEED_KN = 14;

function Index() {
  const [grid, setGrid] = useState<WavePoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(3.5);
  const [show, setShow] = useState({ planned: true, optimized: true });

  useEffect(() => {
    fetchWaveGrid().then(setGrid).catch((e) => setError(e.message));
  }, []);

  const planned = useMemo(() => greatCircle(LISBON, HALIFAX, 40), []);
  const rerouted = useMemo(() => (grid.length ? weatherRoute(planned, grid, threshold) : planned), [planned, grid, threshold]);

  const stats = useMemo(() => {
    const dP = routeLengthNm(planned), dR = routeLengthNm(rerouted);
    const wP = planned.map((p) => waveAt(p, grid)), wR = rerouted.map((p) => waveAt(p, grid));
    return {
      dP, dR, maxP: Math.max(0, ...wP), maxR: Math.max(0, ...wR),
      chart: planned.map((_, i) => ({ wp: i, pianificata: +(wP[i] ?? 0).toFixed(2), ottimizzata: +(wR[i] ?? 0).toFixed(2) })),
    };
  }, [planned, rerouted, grid]);

  const kpis: { label: string; value: string; sub?: string; toggle?: "planned" | "optimized" }[] = [
    { label: "Distanza pianificata", value: `${stats.dP.toFixed(0)} nm`, toggle: "planned" },
    { label: "Distanza ottimizzata", value: `${stats.dR.toFixed(0)} nm`, sub: `+${(stats.dR - stats.dP).toFixed(0)} nm`, toggle: "optimized" },
    { label: "Onda max pianificata", value: `${stats.maxP.toFixed(1)} m` },
    { label: "Onda max ottimizzata", value: `${stats.maxR.toFixed(1)} m` },
    { label: `Durata @ ${SPEED_KN} kn`, value: `${(stats.dR / SPEED_KN / 24).toFixed(1)} gg` },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border px-6 py-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">Atlas · Nord Atlantico</p>
          <h1 className="font-display text-2xl font-semibold">Lisbona → Halifax</h1>
        </div>
        <div className="w-72">
          <div className="mb-2 flex justify-between font-mono text-xs text-muted-foreground">
            <span>Soglia onda evitata</span><span className="text-foreground">{threshold.toFixed(1)} m</span>
          </div>
          <Slider min={1} max={8} step={0.5} value={[threshold]} onValueChange={(v) => setThreshold(v[0] ?? 3.5)} />
        </div>
      </header>

      <main className="grid gap-4 p-4 lg:grid-cols-[1fr_380px]">
        <section className="panel relative h-[62vh] overflow-hidden">
          <AtlasMap grid={grid} planned={planned} rerouted={rerouted} show={show} />
          <div className="panel absolute bottom-3 left-3 z-[500] space-y-1 p-3 font-mono text-xs">
            <Legend swatch="bg-route-planned" label="Pianificata" dashed />
            <Legend swatch="bg-route-weather" label="Meteo-ottimizzata" />
            <div className="flex gap-2 pt-1">
              {[["bg-sea-calm", "<1.5"], ["bg-sea-moderate", "<3"], ["bg-sea-rough", "<5"], ["bg-sea-severe", "5+ m"]].map(([c, l]) => (
                <span key={l} className="flex items-center gap-1"><i className={`h-2 w-2 rounded-full ${c}`} />{l}</span>
              ))}
            </div>
            {error && <p className="text-destructive">{error}</p>}
            {!grid.length && !error && <p className="text-muted-foreground">Caricamento onde…</p>}
          </div>
        </section>

        <aside className="grid content-start gap-3">
          {kpis.map((k) => {
            const active = !k.toggle || show[k.toggle];
            return (
              <div
                key={k.label}
                onClick={k.toggle ? () => setShow((s) => ({ ...s, [k.toggle!]: !s[k.toggle!] })) : undefined}
                className={`panel flex items-baseline justify-between px-4 py-3 transition-opacity ${
                  k.toggle ? `cursor-pointer ${active ? "" : "opacity-40"}` : ""
                }`}
                title={k.toggle ? "Clicca per mostrare/nascondere la rotta" : undefined}
              >
                <span className="text-xs text-muted-foreground">{k.label}</span>
                <span className="font-mono text-lg">
                  {k.value}
                  {k.sub && <span className="ml-2 text-xs text-primary">{k.sub}</span>}
                </span>
              </div>
            );
          })}
        </aside>

        <section className="panel p-4 lg:col-span-1">
          <h2 className="mb-3 font-display text-sm font-semibold">Altezza d'onda lungo la rotta</h2>
          <div className="h-56">
            <ResponsiveContainer>
              <LineChart data={stats.chart}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="wp" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} unit=" m" />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)" }} />
                <ReferenceLine y={threshold} stroke="var(--sea-severe)" strokeDasharray="4 4" />
                <Line dataKey="pianificata" stroke="var(--route-planned)" dot={false} strokeWidth={2} />
                <Line dataKey="ottimizzata" stroke="var(--route-weather)" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel grid place-items-center border-dashed p-6 text-center">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-primary">Business</p>
            <p className="mt-2 text-sm text-muted-foreground">Spazio pronto per costi carburante, ETA, noli e altri grafici.</p>
          </div>
        </section>
      </main>
    </div>
  );
}

function Legend({ swatch, label, dashed }: { swatch: string; label: string; dashed?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <i className={`h-0.5 w-6 ${swatch} ${dashed ? "opacity-60" : ""}`} />{label}
    </div>
  );
}
