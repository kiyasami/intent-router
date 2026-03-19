import { IntentRouter } from "@intent-router/core";
import { commands } from "./commands";
import {
  pinnedRouteSignal,
  centroidSignal,
  affinitySignal,
  routeParamSignal,
} from "@intent-router/core";
import { COMMON_STOP_WORDS } from "./constants";

// custom signal example; the demo will allow toggling pins via metadata.
export const router = new IntentRouter({
  dimension: 1024,
  commands,
  embedOptions: {
    stopWords: COMMON_STOP_WORDS,
  },
  signals: [routeParamSignal, centroidSignal, affinitySignal, pinnedRouteSignal],
});
