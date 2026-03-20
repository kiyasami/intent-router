import {
  createAffinitySignal,
  createCentroidSignal,
  createPinnedRouteSignal,
  createRouteParamSignal,
  IntentRouter,
} from "@intent-router/core";
import { commands } from "./commands";
import { COMMON_STOP_WORDS, DEMO_SIGNAL_WEIGHTS } from "./constants";

// custom signal example; the demo will allow toggling pins via metadata.
export const router = new IntentRouter({
  dimension: 1024,
  commands,
  signalWeights: DEMO_SIGNAL_WEIGHTS,
  embedOptions: {
    stopWords: COMMON_STOP_WORDS,
  },
  signals: [
    createRouteParamSignal(DEMO_SIGNAL_WEIGHTS),
    createCentroidSignal(DEMO_SIGNAL_WEIGHTS),
    createAffinitySignal(DEMO_SIGNAL_WEIGHTS),
    createPinnedRouteSignal(DEMO_SIGNAL_WEIGHTS),
  ],
});
