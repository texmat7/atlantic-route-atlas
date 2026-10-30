import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export const PARAMETER_HELP = {
  hs: "Significant wave height (Hs), in metres: the average height of the highest one-third of waves. Individual waves can be higher. This is not the ship’s vertical movement.",
  heave: "Heave is the ship’s up-and-down movement, measured in metres. The vessel’s allowable significant heave is 3.5 m; values above this limit are non-compliant.",
  roll: "Roll is the ship’s side-to-side tilt, measured in degrees. This vessel’s allowable roll is 5°.",
  vessel: "4250 TEU is the nominal capacity in twenty-foot container units. Speed is 24.5 knots (nautical miles per hour).",
  threshold: "Wave height, in metres, above which the current-wave routing model attempts an avoidance. It is a wave threshold, not a heave limit; this illustrative route is separate from the historical pipeline maneuvers.",
  adv: "Added Detection Value (ADV) = all-mission coincidence probability at this waypoint divided by the highest probability on the route. A score of 1 marks the best-covered waypoint; lower scores mean less relative satellite coverage. It is not the probability of safety or damage avoidance.",
  coincidence: "The share of hazardous events at a waypoint coinciding with a satellite observation. Sentinel-1 uses that mission alone; all missions includes the full SAR and altimetry constellation. Shown as a percentage, not a guarantee of advance warning.",
  blind: "A waypoint is classified as blind when all-mission coincidence is below 22%. The displayed percentage is the share of route waypoints below this cutoff, not a distance-weighted share.",
  bias: "Mean observed altimeter wave height minus CMEMS forecast wave height, in metres. A positive difference indicates that CMEMS underestimated the observed waves.",
  compliance: "The fraction of hazardous events in which the pipeline maneuver restored the vessel’s safety limits. The heave reduction is movement before minus movement after the maneuver, in metres.",
  fleetSize: "Number of vessels included in the annual fleet cost–benefit calculation.",
  fuelPrice: "Assumed price per metric tonne of very low sulphur fuel oil (VLSFO), in US dollars. This is an economic scenario input, not a live market quote.",
  damageProb: "P(damage | unwarned hazard) is the assumed chance of a damage incident given a hazardous encounter without a warning. For example, 2% means two incidents per 100 such encounters on average; it is not a probability per voyage.",
  avgLoss: "Assumed average cost of one damage incident, in US dollars, including cargo, hull damage and delay. It is multiplied by the damage probability to estimate expected loss.",
  roi: "Return on investment = (avoided expected loss − additional fuel cost) / additional fuel cost, expressed as a percentage. This economic scenario uses the current fuel-penalty assumption, not the historical fuel savings chart.",
  hazards: "Expected hazardous encounters per year = fleet size × 18 transits per vessel per year × 0.6 hazards per transit. These are scenario assumptions.",
  warned: "Expected warned encounters per year = annual hazards × mean all-mission coincidence across route waypoints. The economic model treats this coverage share as the fraction warned.",
  breakEven: "Damage probability at which expected avoided loss equals additional fuel cost: fuel tonnes per avoidance × fuel price / average loss. The scenario assumes 8 extra tonnes per avoidance.",
  fuel: "Fuel change due to the maneuver, in metric tonnes, relative to the baseline. Negative values mean fuel saved, not negative absolute consumption.",
  maneuverFuel: "Fuel consumed for the maneuver, in metric tonnes, from the pipeline’s reroute_foc_ton field. This is absolute consumption, not the change relative to the baseline. The supplied dataset reports 0.48 t for every event.",
  safetyMargin: "Recovered heave safety margin, in metres, from the pipeline’s heave_margin_recovered_m field, averaged over hazardous events at each waypoint. It is distinct from heave reduction (delta_heave_m). The generating Python script is not supplied, so its exact formula cannot be verified here.",
  waypoint: "A numbered geographic point along the Lisbon → Halifax pipeline route. Waypoint results describe historical hazardous encounters at that location, not an annual average or a live voyage forecast.",
} as const;

export function ParameterHelp({ term, children }: { term: keyof typeof PARAMETER_HELP; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="cursor-help border-b border-dotted border-muted-foreground/60 outline-none focus-visible:ring-1 focus-visible:ring-ring">{children}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="z-[1000] max-w-80 border border-border bg-popover px-3 py-2 text-xs leading-relaxed text-popover-foreground">
        {PARAMETER_HELP[term]}
      </TooltipContent>
    </Tooltip>
  );
}