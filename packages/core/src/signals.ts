import { dot } from "./embed";
import { confidence } from "./profile";
import { ScoreSignal } from "./types";

/**
 * Boost based on the centroid vector stored in the profile for a command.
 * Returns a small weighted score scaled by confidence.
 */
export const centroidSignal: ScoreSignal = ({
  queryVec,
  command,
  profile,
}) => {
  const centroidRaw = profile?.centroids?.[command.id];
  const count = profile?.counts?.[command.id] ?? 0;
  if (!centroidRaw) return 0;
  const centroid = Float32Array.from(centroidRaw);
  return 0.2 * dot(queryVec, centroid) * confidence(count);
};

/**
 * Simple affinity boost. The profile.affinities value is treated as a
 * recency/frequency counter and scaled into a small capped boost.
 */
export const affinitySignal: ScoreSignal = ({ command, profile }) => {
  const affinity = profile?.affinities?.[command.id] ?? 0;
  return Math.min(0.1, affinity * 0.02);
};

/**
 * An example custom signal that can be used by applications. If the
 * profile.metadata.pinnedRoutes array contains the command id, return a
 * fixed small boost. This demonstrates how users can provide their own
 * signals; the demo app uses it.
 */
export const pinnedRouteSignal: ScoreSignal = ({ command, profile }) => {
  const pins = profile?.metadata?.pinnedRoutes;
  if (Array.isArray(pins) && pins.includes(command.id)) {
    return 0.08;
  }
  return 0;
};

export const defaultSignals: ScoreSignal[] = [centroidSignal, affinitySignal];
