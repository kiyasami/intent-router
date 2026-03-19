import { DEFAULT_DIM, embed } from "./embed";
import { LocalProfileStore, ProfileProvider } from "./provider";
import {
  CommandId,
  EmbedOptions,
  ProfileMetadata,
  UserProfile,
  VectorLike,
} from "./types";

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

function resolveDimension(
  dimension?: number,
  embedOptions?: EmbedOptions
): number {
  return embedOptions?.dimension ?? dimension ?? DEFAULT_DIM;
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

export function serializeProfile<TMeta extends ProfileMetadata = ProfileMetadata>(
  profile?: UserProfile<TMeta>
): UserProfile<TMeta> {
  if (!profile) return {};

  const centroids = profile.centroids
    ? Object.fromEntries(
        Object.entries(profile.centroids).map(([commandId, vec]) => [
          commandId,
          Array.from(toFloat32(vec)),
        ])
      )
    : undefined;

  return {
    centroids,
    counts: profile.counts ? { ...profile.counts } : undefined,
    affinities: profile.affinities ? { ...profile.affinities } : undefined,
    metadata: profile.metadata,
  };
}

export function learnIntoProfile<TMeta extends ProfileMetadata = ProfileMetadata>(
  args: {
    profile?: UserProfile<TMeta>;
    commandId: CommandId;
    queryVec: Float32Array;
    affinityDelta?: number;
  }
): UserProfile<TMeta> {
  const { profile, commandId, queryVec, affinityDelta = 1 } = args;
  const out = cloneProfile(profile);

  const oldCentroid = out.centroids?.[commandId] ?? null;
  const oldCount = out.counts?.[commandId] ?? 0;
  const { centroid, count } = updateCentroid(
    oldCentroid instanceof Float32Array ? oldCentroid : null,
    oldCount,
    queryVec
  );

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

  async init(
    userId: string,
    options?: { dimension?: number }
  ): Promise<UserProfile<TMeta>> {
    return this.loadProfile(userId, options);
  }

  async loadProfile(
    userId: string,
    options?: { dimension?: number }
  ): Promise<UserProfile<TMeta>> {
    const local = this.store.getLocalProfile(userId);
    if (local) {
      return this.validateProfileDimensions(local, options?.dimension);
    }

    if (!this.provider) return {};

    const external = await this.provider.getProfile(userId);
    const clonedProfile = cloneProfile(external);
    const validatedProfile = this.validateProfileDimensions(
      clonedProfile,
      options?.dimension
    );

    if (validatedProfile) {
      this.store.setLocalProfile(userId, validatedProfile);
      return validatedProfile;
    }

    return {};
  }

  private validateProfileDimensions(
    profile?: UserProfile<TMeta>,
    dimension = DEFAULT_DIM
  ): UserProfile<TMeta> {
    if (!profile) return {};

    if (profile.centroids) {
      for (const [commandId, vec] of Object.entries(profile.centroids)) {
        if (vec.length !== dimension) {
          throw new Error(
            `Profile centroid dimension mismatch for command "${commandId}". Expected ${dimension}, got ${vec.length}.`
          );
        }
      }
    }

    return profile;
  }

  getLocal(userId: string): UserProfile<TMeta> | undefined {
    return this.store.getLocalProfile(userId);
  }

  exportProfile(userId: string): UserProfile<TMeta> {
    return serializeProfile(this.getLocal(userId));
  }

  importProfile(
    userId: string,
    profile: UserProfile<TMeta>,
    options?: { dimension?: number }
  ): UserProfile<TMeta> {
    const validated = this.validateProfileDimensions(
      cloneProfile(profile),
      options?.dimension
    );
    this.store.setLocalProfile(userId, validated);
    return validated;
  }

  setLocal(
    userId: string,
    profile: UserProfile<TMeta>,
    options?: { dimension?: number }
  ): void {
    this.store.setLocalProfile(
      userId,
      this.validateProfileDimensions(profile, options?.dimension)
    );
  }

  resetLocal(userId: string): void {
    this.store.clearLocalProfile?.(userId);
  }

  learnLocal(
    args: {
      userId: string;
      query: string;
      commandId: CommandId;
      affinityDelta?: number;
    },
    options: {
      blankQuery?: boolean;
      dimension?: number;
      embedOptions?: EmbedOptions;
    } = {}
  ): UserProfile<TMeta> {
    const { userId, query, commandId, affinityDelta = 1 } = args;
    const { blankQuery = query.trim().length === 0, dimension, embedOptions } = options;
    const resolvedDimension = resolveDimension(dimension, embedOptions);

    const localProfile = blankQuery
      ? bumpAffinity({
          profile: this.getLocal(userId),
          commandId,
          affinityDelta,
        })
      : learnIntoProfile({
          profile: this.getLocal(userId),
          commandId,
          queryVec: embed(query, resolvedDimension, embedOptions),
          affinityDelta,
        });

    this.setLocal(userId, localProfile, { dimension: resolvedDimension });
    return localProfile;
  }
}

export class LocalStorageProfileStore<
  TMeta extends ProfileMetadata = ProfileMetadata
>
  implements LocalProfileStore<TMeta>
{
  getLocalProfile(userId: string): UserProfile<TMeta> | undefined {
    const raw = localStorage.getItem(`intent-router:${userId}`);
    if (!raw) return undefined;
    return cloneProfile(JSON.parse(raw) as UserProfile<TMeta>);
  }

  setLocalProfile(userId: string, profile: UserProfile<TMeta>): void {
    localStorage.setItem(
      `intent-router:${userId}`,
      JSON.stringify(serializeProfile(profile))
    );
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
