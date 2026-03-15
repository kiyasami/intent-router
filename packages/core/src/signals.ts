import { dot } from "./embed";
import { confidence } from "./profile";
import { CommandId, ScoreSignal } from "./types";

const CENTROID_SIGNAL_WEIGHT = 0.2;
const AFFINITY_SIGNAL_WEIGHT = 0.04;
const AFFINITY_SIGNAL_CAP = 0.12;
const PINNED_ROUTE_BOOST = 0.08;

type PinnedRouteMetadata = {
  pinnedRoutes?: readonly CommandId[];
};

function hasPinnedRoutesMetadata(value: unknown): value is PinnedRouteMetadata {
  if (!value || typeof value !== "object") return false;
  return "pinnedRoutes" in value;
}

export const centroidSignal: ScoreSignal = ({
  isBlankQuery,
  queryVec,
  command,
  profile,
}) => {
  if (isBlankQuery) return { name: "centroid", score: 0 };

  const centroid = profile?.centroids?.[command.id];
  const count = profile?.counts?.[command.id] ?? 0;
  console.log("centroid", centroid)
  if (!centroid || count <= 0 || centroid.length !== queryVec.length) {
    return { name: "centroid", score: 0 };
  }

  return {
    name: "centroid",
    score: CENTROID_SIGNAL_WEIGHT * dot(queryVec, centroid as Float32Array) * confidence(count),
  };
};

export const affinitySignal: ScoreSignal = ({ command, profile }) => {
  const affinity = profile?.affinities?.[command.id] ?? 0;
  if (affinity <= 0) return { name: "affinity", score: 0 };

  return {
    name: "affinity",
    score: Math.min(
      AFFINITY_SIGNAL_CAP,
      AFFINITY_SIGNAL_WEIGHT * Math.log1p(affinity)
    ),
  };
};

export const pinnedRouteSignal: ScoreSignal = ({ command, profile }) => {
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
    score: pins.includes(command.id) ? PINNED_ROUTE_BOOST : 0,
  };
};

export const defaultSignals: readonly ScoreSignal[] = [
  centroidSignal,
  affinitySignal,
];