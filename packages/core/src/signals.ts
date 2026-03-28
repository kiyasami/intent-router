import { dot } from "./embed.js";
import { confidence } from "./profile.js";
import { computeRouteParamBoost } from "./route.js";
import {
  CommandId,
  RouteSignalOptions,
  ScoreSignal,
  SignalWeights,
} from "./types.js";

export const defaultSignalWeights: Required<SignalWeights> = {
  centroidWeight: 0.2,
  affinityWeight: 0.04,
  affinityCap: 0.12,
  pinnedWeight: 0.08,
  routeParamWeight: 1,
};

type PinnedRouteMetadata = {
  pinnedRoutes?: readonly CommandId[];
};

function hasPinnedRoutesMetadata(value: unknown): value is PinnedRouteMetadata {
  if (!value || typeof value !== "object") return false;
  return "pinnedRoutes" in value;
}

export function createCentroidSignal(
  weights: SignalWeights = {}
): ScoreSignal {
  const centroidWeight =
    weights.centroidWeight ?? defaultSignalWeights.centroidWeight;

  return ({ isBlankQuery, queryVec, command, profile }) => {
    if (isBlankQuery) return { name: "centroid", score: 0 };

    const centroid = profile?.centroids?.[command.id];
    const count = profile?.counts?.[command.id] ?? 0;
    if (!centroid || count <= 0 || centroid.length !== queryVec.length) {
      return { name: "centroid", score: 0 };
    }

    return {
      name: "centroid",
      score:
        centroidWeight *
        dot(queryVec, centroid as Float32Array) *
        confidence(count),
    };
  };
}

export function createAffinitySignal(
  weights: SignalWeights = {}
): ScoreSignal {
  const affinityWeight =
    weights.affinityWeight ?? defaultSignalWeights.affinityWeight;
  const affinityCap =
    weights.affinityCap ?? defaultSignalWeights.affinityCap;

  return ({ command, profile }) => {
    const affinity = profile?.affinities?.[command.id] ?? 0;
    if (affinity <= 0) return { name: "affinity", score: 0 };

    return {
      name: "affinity",
      score: Math.min(affinityCap, affinityWeight * Math.log1p(affinity)),
    };
  };
}

export function createPinnedRouteSignal(
  weights: SignalWeights = {}
): ScoreSignal {
  const pinnedWeight =
    weights.pinnedWeight ?? defaultSignalWeights.pinnedWeight;

  return ({ command, profile }) => {
    const metadata = profile?.metadata;
    if (!hasPinnedRoutesMetadata(metadata)) {
      return { name: "pinned", score: 0 };
    }

    const pins = metadata.pinnedRoutes;
    if (!Array.isArray(pins)) {
      return { name: "pinned", score: 0 };
    }

    return {
      name: "pinned",
      score: pins.includes(command.id) ? pinnedWeight : 0,
    };
  };
}

export function createRouteParamSignal(
  weights: SignalWeights = {},
  options: RouteSignalOptions = {}
): ScoreSignal {
  const routeParamWeight =
    weights.routeParamWeight ?? defaultSignalWeights.routeParamWeight;
  const { scoring } = options;

  return ({ command, query, isBlankQuery }) => {
    if (isBlankQuery) {
      return { name: "route_params", score: 0 };
    }

    return {
      name: "route_params",
      score: routeParamWeight * computeRouteParamBoost(command, query, scoring),
    };
  };
}

export function createDefaultSignals(
  weights: SignalWeights = {}
): readonly ScoreSignal[] {
  return [
    createCentroidSignal(weights),
    createAffinitySignal(weights),
  ];
}

export const centroidSignal = createCentroidSignal();
export const affinitySignal = createAffinitySignal();
export const pinnedRouteSignal = createPinnedRouteSignal();
export const routeParamSignal = createRouteParamSignal();
export const defaultSignals: readonly ScoreSignal[] = createDefaultSignals();
