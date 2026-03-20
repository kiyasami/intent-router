export const STORAGE_KEY = "cmdk-demo-commands";
export const DEFAULT_LIST_LIMIT = 10;
export const COMMON_STOP_WORDS = [
  "a",
  "an",
  "and",
  "by",
  "for",
  "from",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
];

export const DEMO_SIGNAL_WEIGHTS = {
  centroidWeight: 0.2,
  affinityWeight: 0.04,
  affinityCap: 0.12,
  pinnedWeight: 0.08,
  routeParamWeight: 1,
} as const;
