import { CommandId, UserProfile, VectorLike } from "./types";

const CONFIDENCE_LOG_SCALE = 4;

export function confidence(count: number): number {
  if (count <= 0) return 0;
  return Math.min(1, Math.log(count + 1) / CONFIDENCE_LOG_SCALE);
}

export function toFloat32(vec: VectorLike): Float32Array {
  return vec instanceof Float32Array ? Float32Array.from(vec) : new Float32Array(vec);
}

export function updateCentroid(
  oldCentroid: Float32Array | null,
  oldCount: number,
  newVec: Float32Array
): { centroid: Float32Array; count: number } {
  if (oldCentroid && oldCentroid.length !== newVec.length) {
    throw new Error("Centroid dimension mismatch");
  }

  const count = oldCount + 1;
  const centroid = oldCentroid
    ? Float32Array.from(oldCentroid)
    : new Float32Array(newVec.length);

  for (let i = 0; i < centroid.length; i++) {
    centroid[i] = centroid[i] + (newVec[i] - centroid[i]) / count;
  }

  let sumSq = 0;
  for (let i = 0; i < centroid.length; i++) {
    sumSq += centroid[i] * centroid[i];
  }

  const norm = Math.sqrt(sumSq) || 1;
  for (let i = 0; i < centroid.length; i++) {
    centroid[i] /= norm;
  }

  return { centroid, count };
}

function cloneCentroids(
  centroids?: Record<CommandId, VectorLike>
): Record<CommandId, Float32Array> | undefined {
  if (!centroids) return undefined;

  const out: Record<CommandId, Float32Array> = {};
  for (const [commandId, vec] of Object.entries(centroids)) {
    out[commandId] = toFloat32(vec);
  }
  return out;
}

export function cloneProfile<TMeta = unknown>(
  profile?: UserProfile<TMeta>
): UserProfile<TMeta> {
  if (!profile) return {};

  return {
    centroids: cloneCentroids(profile.centroids),
    counts: profile.counts ? { ...profile.counts } : undefined,
    affinities: profile.affinities ? { ...profile.affinities } : undefined,
    metadata: profile.metadata,
  };
}

export function mergeProfiles<TMeta = unknown>(
  local?: UserProfile<TMeta>,
  external?: UserProfile<TMeta>
): UserProfile<TMeta> {
  if (!local && !external) return {};
  if (!local) return cloneProfile(external);
  if (!external) return cloneProfile(local);

  return {
    centroids: {
      ...(cloneCentroids(local.centroids) ?? {}),
      ...(cloneCentroids(external.centroids) ?? {}),
    },
    counts: {
      ...(local.counts ?? {}),
      ...(external.counts ?? {}),
    },
    affinities: {
      ...(local.affinities ?? {}),
      ...(external.affinities ?? {}),
    },
    metadata:
      external.metadata !== undefined ? external.metadata : local.metadata,
  };
}

export function learnIntoProfile<TMeta = unknown>(args: {
  profile?: UserProfile<TMeta>;
  commandId: CommandId;
  queryVec: Float32Array;
  affinityDelta?: number;
}): UserProfile<TMeta> {
  const { profile, commandId, queryVec, affinityDelta = 1 } = args;
  const out = cloneProfile(profile);

  const oldCentroid = out.centroids?.[commandId] ?? null;
  const oldCount = out.counts?.[commandId] ?? 0;
  const { centroid, count } = updateCentroid(oldCentroid as Float32Array, oldCount, queryVec);

  out.centroids ??= {};
  out.centroids[commandId] = centroid;

  out.counts ??= {};
  out.counts[commandId] = count;

  out.affinities ??= {};
  out.affinities[commandId] = (out.affinities[commandId] ?? 0) + affinityDelta;

  return out;
}

export function bumpAffinity<TMeta = unknown>(args: {
  profile?: UserProfile<TMeta>;
  commandId: CommandId;
  affinityDelta?: number;
}): UserProfile<TMeta> {
  const { profile, commandId, affinityDelta = 1 } = args;
  const out = cloneProfile(profile);

  out.affinities ??= {};
  out.affinities[commandId] = (out.affinities[commandId] ?? 0) + affinityDelta;

  return out;
}