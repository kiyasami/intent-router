import { globalConfig } from "./constants";
import { embed } from "./embed";
import { LocalProfileStore, ProfileProvider } from "./provider";
import { CommandId, EmbedOptions, ProfileMetadata, UserProfile, VectorLike } from "./types";

const CONFIDENCE_LOG_SCALE = 4;

export function confidence(count: number): number {
  if (count <= 0) return 0;
  return Math.min(1, Math.log(count + 1) / CONFIDENCE_LOG_SCALE);
}

export function toFloat32(vec: VectorLike): Float32Array {
  if (vec instanceof Float32Array) {
    return Float32Array.from(vec);
  }

  if (Array.isArray(vec)) {
    return new Float32Array(vec);
  }

  if (vec && typeof vec === "object") {
    const entries = Object.entries(vec)
      .filter(([key]) => /^\d+$/.test(key))
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([, value]) => Number(value));

    return new Float32Array(entries);
  }

  return new Float32Array(0);
}

export function updateCentroid(
  oldCentroid: Float32Array | null,
  oldCount: number,
  newVec: Float32Array
): { centroid: Float32Array; count: number } {

  const count = oldCount ? oldCount + 1 : 1;
  const centroid = oldCentroid instanceof Float32Array
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

export function cloneProfile<TMeta extends ProfileMetadata = ProfileMetadata>(
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


export function learnIntoProfile<TMeta extends ProfileMetadata = ProfileMetadata>(args: {
  profile?: UserProfile<TMeta>;
  commandId: CommandId;
  queryVec: Float32Array;
  affinityDelta?: number;
}): UserProfile<TMeta> {
  const { profile, commandId, queryVec, affinityDelta = 1 } = args;
  const out = cloneProfile(profile);

  const oldCentroid = out.centroids?.[commandId] ?? null;
  const oldCount = out.counts?.[commandId] ?? 0
  const { centroid, count } =updateCentroid(oldCentroid instanceof Float32Array ? oldCentroid : null, oldCount, queryVec);

  out.centroids ??= {};
  out.centroids[commandId] = centroid;

  out.counts ??= {};
  out.counts[commandId] = count;

  out.affinities ??= {};
  out.affinities[commandId] = (out.affinities[commandId] ?? 0) + affinityDelta;

  return out;
}

export function bumpAffinity<TMeta extends ProfileMetadata = ProfileMetadata>(args: {
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

export class ProfileManager<TMeta extends ProfileMetadata = ProfileMetadata> {
  constructor(
    private store: LocalProfileStore<TMeta>,
    private provider?: ProfileProvider<TMeta>
  ) {}

  async init(userId: string): Promise<UserProfile<TMeta>> {
    const local = this.store.getLocalProfile(userId);
    if (local) return local;

    if (!this.provider) return {};

    const external = await this.provider.getProfile(userId);
    const clonedProfile = cloneProfile(external);
    const validateProfile = this.validateProfileDimensions(clonedProfile);
    if (validateProfile) {
      this.store.setLocalProfile(userId, validateProfile);
      return validateProfile;
    }

    return {};
  }

  private validateProfileDimensions(
    profile?: UserProfile<TMeta>
  ): UserProfile<TMeta> {
    if (!profile) return {};

    if (profile.centroids) {
      for (const [commandId, vec] of Object.entries(profile.centroids)) {
        if (vec.length !== globalConfig.DEFAULT_DIM) {
          throw new Error(
            `Profile centroid dimension mismatch for command "${commandId}". Expected ${globalConfig.DEFAULT_DIM}, got ${vec.length}.`
          );
        }
      }
    }

    return profile;
  }
  getLocal(userId: string): UserProfile<TMeta> | undefined {
    return this.store.getLocalProfile(userId);
  }

  setLocal(userId: string, profile: UserProfile<TMeta>): void {
    this.store.setLocalProfile(userId, profile);
  }

  resetLocal(userId: string): void {
    this.store.clearLocalProfile?.(userId);
  }
  learnLocal(args: {
      query: string;
      commandId: CommandId;
      affinityDelta?: number;
    }, blankQuery: boolean, embedOptions: EmbedOptions):void {
      const { query, commandId, affinityDelta = 1 } = args;
      const localProfile = blankQuery
        ? bumpAffinity({
            profile: this.getLocal("demo-user"),
            commandId,
            affinityDelta,
          })
        : learnIntoProfile({
            profile: this.getLocal("demo-user"),
            commandId,
            queryVec: embed(query, globalConfig.DEFAULT_DIM, embedOptions),
            affinityDelta,
          });
  
       this.setLocal("demo-user", localProfile);
    }
}

export class LocalStorageProfileStore<
  TMeta extends ProfileMetadata = ProfileMetadata
>
  implements LocalProfileStore<TMeta>
{
  getLocalProfile(userId: string): UserProfile<TMeta> | undefined {
    const raw = localStorage.getItem(`intent-router:${userId}`);
    return raw ? JSON.parse(raw) : undefined;
  }

  setLocalProfile(userId: string, profile: UserProfile<TMeta>): void {
    localStorage.setItem(`intent-router:${userId}`, JSON.stringify(profile));
  }

  clearLocalProfile(userId: string): void {
    localStorage.removeItem(`intent-router:${userId}`);
  }
}

export class ApiProfileProvider<
  TMeta extends ProfileMetadata = ProfileMetadata
>
  implements ProfileProvider<TMeta>
{
  async getProfile(userId: string): Promise<UserProfile<TMeta> | undefined> {
    try {
      // const res = await fetch(`/api/profile/${userId}`);
      // if (!res.ok) return undefined;
      // return res.json();
      return undefined;
    } catch (error) {
      console.error("Error fetching profile:", error);
      return undefined;
    }
  }
}
