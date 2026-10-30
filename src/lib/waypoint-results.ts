import data from "@/data/waypoint-maneuvers.json";

/** Historical event means, joined by event_id and grouped by route_node.
 * Fuel is the pipeline's absolute maneuver consumption, not delta_foc_ton.
 * Recovered margins preserve the dedicated pipeline fields without redefining them.
 */
export function waypointSafetyFuel() {
  return data;
}