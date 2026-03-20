import { LocalProfileStore, ProfileProvider } from "./provider.js";
import { CommandId, EmbedOptions, ProfileMetadata, UserProfile, VectorLike } from "./types.js";
export declare function confidence(count: number): number;
export declare function toFloat32(vec: VectorLike): Float32Array;
export declare function updateCentroid(oldCentroid: Float32Array | null, oldCount: number, newVec: Float32Array): {
    centroid: Float32Array;
    count: number;
};
export declare function cloneProfile<TMeta extends ProfileMetadata = ProfileMetadata>(profile?: UserProfile<TMeta>): UserProfile<TMeta>;
export declare function serializeProfile<TMeta extends ProfileMetadata = ProfileMetadata>(profile?: UserProfile<TMeta>): UserProfile<TMeta>;
export declare function learnIntoProfile<TMeta extends ProfileMetadata = ProfileMetadata>(args: {
    profile?: UserProfile<TMeta>;
    commandId: CommandId;
    queryVec: Float32Array;
    affinityDelta?: number;
}): UserProfile<TMeta>;
export declare function bumpAffinity<TMeta extends ProfileMetadata = ProfileMetadata>(args: {
    profile?: UserProfile<TMeta>;
    commandId: CommandId;
    affinityDelta?: number;
}): UserProfile<TMeta>;
export declare class ProfileManager<TMeta extends ProfileMetadata = ProfileMetadata> {
    private store;
    private provider?;
    constructor(store: LocalProfileStore<TMeta>, provider?: ProfileProvider<TMeta> | undefined);
    init(userId: string, options?: {
        dimension?: number;
    }): Promise<UserProfile<TMeta>>;
    loadProfile(userId: string, options?: {
        dimension?: number;
    }): Promise<UserProfile<TMeta>>;
    private validateProfileDimensions;
    getLocal(userId: string): UserProfile<TMeta> | undefined;
    exportProfile(userId: string): UserProfile<TMeta>;
    importProfile(userId: string, profile: UserProfile<TMeta>, options?: {
        dimension?: number;
    }): UserProfile<TMeta>;
    setLocal(userId: string, profile: UserProfile<TMeta>, options?: {
        dimension?: number;
    }): void;
    resetLocal(userId: string): void;
    learnLocal(args: {
        userId: string;
        query: string;
        commandId: CommandId;
        affinityDelta?: number;
    }, options?: {
        blankQuery?: boolean;
        dimension?: number;
        embedOptions?: EmbedOptions;
    }): UserProfile<TMeta>;
}
export declare class LocalStorageProfileStore<TMeta extends ProfileMetadata = ProfileMetadata> implements LocalProfileStore<TMeta> {
    getLocalProfile(userId: string): UserProfile<TMeta> | undefined;
    setLocalProfile(userId: string, profile: UserProfile<TMeta>): void;
    clearLocalProfile(userId: string): void;
}
export declare class ApiProfileProvider<TMeta extends ProfileMetadata = ProfileMetadata> implements ProfileProvider<TMeta> {
    getProfile(userId: string): Promise<UserProfile<TMeta> | undefined>;
}
