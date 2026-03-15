import { ProfileMetadata, UserProfile } from "./types";

export interface ProfileProvider<
  TMeta extends ProfileMetadata = ProfileMetadata
> {
  getProfile(userId: string): Promise<UserProfile<TMeta> | undefined>;
  saveEvent?(args: { userId: string; query: string; commandId: string }): Promise<void>;
}

export interface LocalProfileStore<
  TMeta extends ProfileMetadata = ProfileMetadata
> {
  getLocalProfile(userId: string): UserProfile<TMeta> | undefined;
  setLocalProfile(userId: string, profile: UserProfile<TMeta>): void;
  clearLocalProfile?(userId: string): void;
}
