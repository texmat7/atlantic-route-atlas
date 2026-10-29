import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Slider } from "@/components/ui/slider";
import { economics, ECON_DEFAULTS, type EconInputs } from "@/lib/simulation";

const usd = (v: number) =>
  Math.abs(v) >= 1e6 ? `$${(v / 1e6).toFixed(2)}M` : `$${(v / 1e3).toFixed(0)}k`;

const CONTROLS: { key: keyof EconInputs; label: string; min: number; max: number; step: number; fmt: (v: number) => string }[] = [
  { key: "fleetSize", label: "Fleet size", min: 1, max: 100, step: 1, fmt: (v) => `${v} ships` },
  { key: "fuelPrice", label: "Fuel price (VLSFO)", min: 300, max: 1200, step: 10, fmt: (v) => `$${v}/t` },
  { key: "damageProb", label: "P(damage | unwarned hazard)", min: 0.001, max: 0.1, step: 0.001, fmt: (v) => `${(v * 100).toFixed(1)}%` },
  { key: "avgLoss", label: "Avg loss per incident", min: 250_000, max: 20_000_000, step: 250_000, fmt: usd },
];

export function EconomicCase({ warnedShare }: { warnedShare: number }) {
  const [inp, setInp] = useState<EconInputs>(ECON_DEFAULTS);
  const r = useMemo(() => economics({ ...inp, warnedShare }), [inp, warnedShare]);
  const data = [
    { name: "Fuel penalty", v: r.cost, c: "var(--route-planned)" },
    { name: "Avoided loss", v: r.avoidedLoss, c: "var(--sea-moderate)" },
    { name: "Net value", v: r.net, c: r.net >= 0 ? "var(--primary)" : "var(--sea-severe)" },
  ];

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-primary">Module E · Economic case</p>
          <h2 className="font-display text-sm font-semibold">Is acting on satellite warnings worth it at fleet scale?</h2>
        </div>
        <span className={`font-mono text-lg ${r.net >= 0 ? "text-primary" : "text-destructive"}`}>
          ROI {(r.roi * 100).toFixed(0)}%
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {CONTROLS.map((c) => (
          <label key={c.key} className="block">
            <div className="mb-1 flex justify-between font-mono text-[10px] text-muted-foreground">
              <span>{c.label}</span><span className="text-foreground">{c.fmt(inp[c.key])}</span>
            </div>
            <Slider min={c.min} max={c.max} step={c.step} value={[inp[c.key]]}
              onValueChange={(v) => setInp((s) => ({ ...s, [c.key]: v[0] ?? s[c.key] }))} />
          </label>
        ))}
      </div>

      <div className="h-36">
        <ResponsiveContainer>
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 10 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tickFormatter={usd} stroke="var(--muted-foreground)" fontSize={10} />
            <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={10} width={80} />
            <Tooltip formatter={(v: number) => usd(v)} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)" }} cursor={{ fill: "var(--accent)" }} />
            <Bar dataKey="v" radius={3}>{data.map((d) => <Cell key={d.name} fill={d.c} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-2 font-mono text-[10px] text-muted-foreground">
        <div>Hazards / yr<p className="text-sm text-foreground">{r.hazards.toFixed(0)}</p></div>
        <div>Warned ({(warnedShare * 100).toFixed(0)}%)<p className="text-sm text-foreground">{r.warned.toFixed(0)}</p></div>
        <div>Break-even P(damage)<p className="text-sm text-foreground">{(r.breakEvenProb * 100).toFixed(2)}%</p></div>
      </div>
    </div>
  );
}
