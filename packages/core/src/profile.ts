import { UserProfile } from "./types";

/**
 * Calculates a confidence score based on the sample count.
 * Uses logarithmic scaling to prevent overconfidence from large counts.
 * @param count The number of samples.
 * @returns A confidence value between 0 and 1.
 */
export function confidence(count: number): number {
  return Math.min(1, Math.log(count + 1) / 4);
}

export function updateCentroid(
  oldCentroid: Float32Array | null,
  oldCount: number,
  newVec: Float32Array
): { centroid: Float32Array; count: number } {
  const count = oldCount + 1;
  const centroid = oldCentroid
    ? Float32Array.from(oldCentroid)
    : new Float32Array(newVec.length);

  for (let i = 0; i < centroid.length; i++) {
    centroid[i] = centroid[i] + (newVec[i] - centroid[i]) / count;
  }

  let sumSq = 0;
  for (let i = 0; i < centroid.length; i++) sumSq += centroid[i] * centroid[i];
  const norm = Math.sqrt(sumSq) || 1;
  for (let i = 0; i < centroid.length; i++) centroid[i] /= norm;

  return { centroid, count };
}

/**
 * Return a deep copy of the profile that can safely be mutated without
 * affecting the original object. If the input is undefined, an empty
 * profile is returned.
 */
export function cloneProfile(profile?: UserProfile): UserProfile {
  if (!profile) return {};
  return {
    centroids: profile.centroids ? { ...profile.centroids } : undefined,
    counts: profile.counts ? { ...profile.counts } : undefined,
    affinities: profile.affinities ? { ...profile.affinities } : undefined,
    metadata: profile.metadata ? { ...profile.metadata } : undefined,
  };
}

/**
 * Incorporate a new query vector into the profile for a given command.
 * - updates centroids using running average
 * - increments counts
 * - adjusts affinity by the provided delta (defaults to 1)
 * Returns a fresh profile object.
 */
export function learnIntoProfile(args: {
  profile?: UserProfile;
  commandId: string;
  queryVec: Float32Array;
  affinityDelta?: number;
}): UserProfile {
  const { profile, commandId, queryVec, affinityDelta = 1 } = args;
  const out = cloneProfile(profile);

  // update centroid
  const oldCentroid = out.centroids?.[commandId]
    ? Float32Array.from(out.centroids![commandId])
    : null;
  const oldCount = out.counts?.[commandId] ?? 0;
  const { centroid, count } = updateCentroid(oldCentroid, oldCount, queryVec);
  out.centroids = out.centroids || {};
  out.centroids[commandId] = Array.from(centroid);
  out.counts = out.counts || {};
  out.counts[commandId] = count;

  // update affinity
  out.affinities = out.affinities || {};
  out.affinities[commandId] = (out.affinities[commandId] ?? 0) + affinityDelta;

  return out;
}
