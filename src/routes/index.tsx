import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Line, LineChart, CartesianGrid, XAxis, YAxis, ReferenceLine, Tooltip, ResponsiveContainer, Legend as RLegend } from "recharts";
import { Slider } from "@/components/ui/slider";
import { AtlasMap } from "@/components/AtlasMap";
import { EconomicCase } from "@/components/EconomicCase";
import { ParameterHelp } from "@/components/ParameterHelp";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { waypointSafetyFuel } from "@/lib/waypoint-results";
import {
  fetchWaveGrid, greatCircle, weatherRoute, routeLengthNm, waveAt, LISBON, HALIFAX, type WavePoint,
} from "@/lib/routing";
import { simulateSegments, simulateEvents, VESSEL, PIPELINE_ROUTE, PIPELINE_EVENT_COUNT } from "@/lib/simulation";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ADV Atlas · Lisbon → Halifax satellite warnings" },
      { name: "description", content: "Added Detection Value atlas: how often a satellite would have warned a Lisbon–Halifax containership of hazardous sea states." },
      { property: "og:title", content: "ADV Atlas · Lisbon → Halifax" },
      { property: "og:description", content: "Satellite coincidence, forecast bias, re-routing value and economic case along the North Atlantic corridor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Tab = "adv" | "waves" | "h4";

function Index() {
  const [grid, setGrid] = useState<WavePoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(VESSEL.heaveMax);
  const [show, setShow] = useState({ planned: true, optimized: true, adv: true, waves: true });
  const [tab, setTab] = useState<Tab>("adv");

  useEffect(() => { fetchWaveGrid().then(setGrid).catch((e) => setError(e.message)); }, []);

  const planned = useMemo(() => PIPELINE_ROUTE, []);
  const rerouted = useMemo(() => (grid.length ? weatherRoute(planned, grid, threshold) : planned), [planned, grid, threshold]);
  const segments = useMemo(() => simulateSegments(planned), [planned]);
  const events = useMemo(() => simulateEvents(), []);

  const s = useMemo(() => {
    const dP = routeLengthNm(planned), dR = routeLengthNm(rerouted);
    const wP = planned.map((p) => waveAt(p, grid)), wR = rerouted.map((p) => waveAt(p, grid));
    const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
    const blind = segments.filter((x) => x.blind).length / segments.length;
    return {
      dP, dR, blind,
      pS1: mean(segments.map((x) => x.pS1)), pAll: mean(segments.map((x) => x.pAll)),
      bias: mean(segments.map((x) => x.bias)),
      heaveRec: mean(events.map((e) => e.heaveBefore - e.heaveAfter)),
      fuel: mean(events.map((e) => e.fuelPenaltyT)),
      compliant: mean(events.map((e) => e.restored)),
      waves: planned.map((_, i) => ({ wp: i, planned: +(wP[i] ?? 0).toFixed(2), rerouted: +(wR[i] ?? 0).toFixed(2) })),
    };
  }, [planned, rerouted, grid, segments, events]);

  const toggle = (k: keyof typeof show) => setShow((v) => ({ ...v, [k]: !v[k] }));

  const hyp = [
    { id: "H1", title: "Constellation boosts coincidence", value: `${(s.pS1 * 100).toFixed(0)}% → ${(s.pAll * 100).toFixed(0)}%`, note: "Sentinel-1 only vs full SAR + altimetry" },
    { id: "H2", title: "Blind corridor", value: `${(s.blind * 100).toFixed(0)}% of route`, note: "Route nodes with all-mission coincidence < 22%" },
    { id: "H3", title: "CMEMS underestimates Hs", value: `${s.bias >= 0 ? "−" : "+"}${Math.abs(s.bias).toFixed(2)} m`, note: "Mean altimeter − CMEMS Hs, coincident events" },
    { id: "H4", title: "Safety recovered", value: `${(s.compliant * 100).toFixed(0)}% compliant`, note: `−${s.heaveRec.toFixed(2)} m heave · ${s.fuel.toFixed(1)} t fuel / event` },
  ];

  return (
    <TooltipProvider delayDuration={400}>
    <div className="min-h-screen bg-background text-foreground">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border px-6 py-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">Added Detection Value Atlas · North Atlantic</p>
          <h1 className="font-display text-2xl font-semibold">Lisbon → Halifax</h1>
          <div className="mt-1.5 flex flex-wrap gap-1.5 font-mono text-[11px]">
            <span className="rounded border border-border bg-secondary px-1.5 py-0.5 text-muted-foreground"><ParameterHelp term="vessel">🚢 {VESSEL.name} · {VESSEL.speedKn} kn</ParameterHelp></span>
            <span className="rounded border border-border bg-secondary px-1.5 py-0.5 text-muted-foreground">⚠ <ParameterHelp term="heave">Heave ≤ {VESSEL.heaveMax} m</ParameterHelp> · <ParameterHelp term="roll">Roll ≤ {VESSEL.rollMax}°</ParameterHelp></span>
            <span className="rounded border border-primary/50 px-1.5 py-0.5 text-primary">PIPELINE DATA · 2010–2020 · {PIPELINE_EVENT_COUNT.toLocaleString("en")} events</span>
          </div>
        </div>
        <div className="w-72">
          <div className="mb-2 flex justify-between font-mono text-xs text-muted-foreground">
            <ParameterHelp term="threshold">Avoided wave threshold</ParameterHelp><span className="text-foreground">{threshold.toFixed(1)} m</span>
          </div>
          <Slider min={1} max={8} step={0.5} value={[threshold]} onValueChange={(v) => setThreshold(v[0] ?? VESSEL.heaveMax)} />
        </div>
      </header>

      <main className="grid gap-4 p-4 lg:grid-cols-[1fr_400px]">
        <section className="panel relative h-[62vh] overflow-hidden">
          <AtlasMap grid={grid} planned={planned} rerouted={rerouted} segments={segments} show={show} />
          <div className="panel absolute bottom-3 left-3 z-[500] space-y-1.5 p-3 font-mono text-xs">
            <Toggle on={show.planned} onClick={() => toggle("planned")}><i className="h-0.5 w-6 bg-route-planned opacity-60" />Planned (great circle)</Toggle>
            <Toggle on={show.optimized} onClick={() => toggle("optimized")}><i className="h-0.5 w-6 bg-route-weather" />Satellite-informed re-route</Toggle>
            <Toggle on={show.adv} onClick={() => toggle("adv")}>
              <span className="flex h-2 w-6 overflow-hidden rounded-sm"><i className="flex-1 bg-sea-severe" /><i className="flex-1 bg-sea-rough" /><i className="flex-1 bg-sea-moderate" /><i className="flex-1 bg-sea-calm" /></span>
              <ParameterHelp term="adv">ADV score (low → high)</ParameterHelp>
            </Toggle>
            <Toggle on={show.waves} onClick={() => toggle("waves")}><i className="h-2 w-2 rounded-full bg-sea-rough" /><ParameterHelp term="hs">Current Hs field</ParameterHelp></Toggle>
            {error && <p className="text-destructive">{error}</p>}
            {!grid.length && !error && <p className="text-muted-foreground">Loading waves…</p>}
          </div>
        </section>

        <aside className="grid content-start gap-3">
          <div className="grid grid-cols-2 gap-3">
            {([["planned", "Planned distance", s.dP, ""], ["optimized", "Re-routed distance", s.dR, `+${(s.dR - s.dP).toFixed(0)}`]] as const).map(([k, l, d, sub]) => (
              <Button variant="ghost" key={k} onClick={() => toggle(k)} aria-pressed={show[k]} title="Click to show/hide the route"
                className={`panel block h-auto px-3 py-2 text-left transition-opacity ${show[k] ? "" : "opacity-40"}`}>
                <span className="block text-[11px] text-muted-foreground">{l}</span>
                <span className="font-mono text-lg">{d.toFixed(0)} nm</span>
                {sub && <span className="ml-1 font-mono text-xs text-primary">{sub}</span>}
              </Button>
            ))}
          </div>
          {hyp.map((h) => (
            <div key={h.id} className="panel flex items-center gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold"><ParameterHelp term={h.id === "H1" ? "coincidence" : h.id === "H2" ? "blind" : h.id === "H3" ? "bias" : "compliance"}>{h.title}</ParameterHelp></p>
                <p className="truncate text-[11px] text-muted-foreground">{h.note}</p>
              </div>
              <span className="font-mono text-sm">{h.value}</span>
            </div>
          ))}
          <div className="panel px-3 py-2 font-mono text-[11px] text-muted-foreground">
            Voyage time @ {VESSEL.speedKn} kn: <span className="text-foreground">{(s.dR / VESSEL.speedKn / 24).toFixed(1)} days</span>
          </div>
        </aside>

        <section className="panel p-4">
          <div className="mb-3 flex gap-1 font-mono text-[11px]">
            {([["adv", "Coincidence & ADV"], ["waves", "Hs along route"], ["h4", "Safety vs fuel"]] as const).map(([k, l]) => (
              <Button size="sm" variant={tab === k ? "default" : "secondary"} key={k} onClick={() => setTab(k)} aria-pressed={tab === k}
                className="h-auto whitespace-normal px-2.5 py-1 text-[11px]">{l}</Button>
            ))}
          </div>
          <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-muted-foreground">
            <ParameterHelp term="waypoint">Waypoint · Lisbon → Halifax</ParameterHelp>
            {tab === "adv" ? <><ParameterHelp term="coincidence">Coincidence (%)</ParameterHelp><ParameterHelp term="adv">ADV score (%)</ParameterHelp></> : tab === "waves" ? <ParameterHelp term="hs">Hs (m)</ParameterHelp> : <><ParameterHelp term="maneuverFuel">Maneuver fuel (t)</ParameterHelp><ParameterHelp term="safetyMargin">Recovered heave margin (m)</ParameterHelp></>}
          </div>
          <div className="h-72">
            <ResponsiveContainer>
              {tab === "adv" ? (
                <AreaChart margin={{ left: 10, right: 10, bottom: 14 }} data={segments.map((x) => ({ wp: x.idx, "Sentinel-1": +(x.pS1 * 100).toFixed(1), "All missions": +(x.pAll * 100).toFixed(1), ADV: +(x.adv * 100).toFixed(1) }))}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="wp" stroke="var(--muted-foreground)" fontSize={11} label={{ value: "Waypoint along route (Lisbon → Halifax)", position: "insideBottom", offset: -4, fill: "var(--muted-foreground)", fontSize: 10 }} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} unit="%" label={{ value: "Probability / ADV score (%)", angle: -90, position: "insideLeft", style: { textAnchor: "middle" }, fill: "var(--muted-foreground)", fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)" }} />
                  <RLegend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine y={22} stroke="var(--sea-severe)" strokeDasharray="4 4" label={{ value: "blind", fill: "var(--sea-severe)", fontSize: 10 }} />
                  <Area dataKey="All missions" stroke="var(--sea-calm)" fill="var(--sea-calm)" fillOpacity={0.15} />
                  <Area dataKey="Sentinel-1" stroke="var(--route-planned)" fill="var(--route-planned)" fillOpacity={0.1} />
                  <Area dataKey="ADV" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.15} />
                </AreaChart>
              ) : tab === "waves" ? (
                <LineChart margin={{ left: 10, right: 10, bottom: 14 }} data={s.waves}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="wp" stroke="var(--muted-foreground)" fontSize={11} label={{ value: "Waypoint along route (Lisbon → Halifax)", position: "insideBottom", offset: -4, fill: "var(--muted-foreground)", fontSize: 10 }} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} unit=" m" label={{ value: "Significant wave height Hs (m)", angle: -90, position: "insideLeft", style: { textAnchor: "middle" }, fill: "var(--muted-foreground)", fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)" }} />
                  <RLegend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine y={threshold} stroke="var(--sea-severe)" strokeDasharray="4 4" />
                  <Line dataKey="planned" stroke="var(--route-planned)" dot={false} strokeWidth={2} />
                  <Line dataKey="rerouted" stroke="var(--route-weather)" dot={false} strokeWidth={2} />
                </LineChart>
              ) : (
                <LineChart margin={{ left: 20, right: 20, bottom: 22 }} data={waypointSafetyFuel()}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="wp" type="number" domain={[0, 58]} stroke="var(--muted-foreground)" fontSize={11} label={{ value: "Waypoint (Lisbon → Halifax)", position: "insideBottom", offset: -10, fill: "var(--muted-foreground)", fontSize: 10 }} />
                  <YAxis yAxisId="h" stroke="var(--muted-foreground)" fontSize={11} unit=" m" label={{ value: "Recovered heave margin (m)", angle: -90, position: "insideLeft", style: { textAnchor: "middle" }, fill: "var(--muted-foreground)", fontSize: 10 }} />
                  <YAxis yAxisId="f" orientation="right" domain={[0, "auto"]} stroke="var(--muted-foreground)" fontSize={11} unit=" t" label={{ value: "Maneuver fuel (t)", angle: 90, position: "insideRight", style: { textAnchor: "middle" }, fill: "var(--muted-foreground)", fontSize: 10 }} />
                  <Tooltip labelFormatter={(wp) => `Waypoint ${wp} · historical event mean`} formatter={(v: number, name: string) => [`${v.toFixed(3)} ${name === "Maneuver fuel" ? "t" : "m"}`, name]} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)" }} />
                  <RLegend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
                  <Line yAxisId="h" name="Recovered heave margin" dataKey="heaveMarginRecoveredM" stroke="var(--sea-calm)" dot={{ r: 2 }} connectNulls={false} />
                  <Line yAxisId="f" name="Maneuver fuel" dataKey="maneuverFuelT" stroke="var(--primary)" strokeDasharray="3 3" dot={false} connectNulls={false} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
          {tab === "h4" && <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">Historical Lisbon–Halifax pipeline maneuvers · mean per hazardous event at each waypoint · gaps indicate no events. Fuel is constant in the supplied output: 0.48 t/event (change: −13.52 t). No maneuver results are supplied for the current-wave re-route.</p>}
        </section>

        <section className="panel p-4">
          <EconomicCase warnedShare={s.pAll} />
        </section>
      </main>
    </div>
    </TooltipProvider>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Button variant="ghost" onClick={onClick} aria-pressed={on} className={`flex h-auto justify-start gap-2 p-0 text-xs font-normal transition-opacity ${on ? "" : "opacity-40"}`}>{children}</Button>
  );
}
