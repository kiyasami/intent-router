import { IntentRouter } from "@intent-router/core";
import { commands } from "./commands";
import { pinnedRouteSignal, centroidSignal, affinitySignal } from "@intent-router/core";

// custom signal example; the demo will allow toggling pins via metadata.
export const router = new IntentRouter({
  dimension: 1024,
  commands,
  signals: [centroidSignal, affinitySignal, pinnedRouteSignal],
});
