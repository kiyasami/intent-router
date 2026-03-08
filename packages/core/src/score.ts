import { dot } from "./embed";
import { confidence } from "./profile";
import { UserProfile } from "./types";

export function computeProfileBoost(args: {
  queryVector: Float32Array;
  commandId: string;
  profile?: UserProfile;
}): number {
  const { queryVector, commandId, profile } = args;

  let profileBoost = 0;
  const centroidRaw = profile?.centroids?.[commandId];
  const count = profile?.counts?.[commandId] ?? 0;
  const affinity = profile?.affinities?.[commandId] ?? 0;

  if (centroidRaw) {
    const centroid = Float32Array.from(centroidRaw);
    profileBoost += 0.2 * dot(queryVector, centroid) * confidence(count);
  }

  if (affinity) {
    profileBoost += Math.min(0.1, affinity * 0.02);
  }

  return profileBoost;
}
