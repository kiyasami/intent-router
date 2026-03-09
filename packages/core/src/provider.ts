import { UserProfile } from "./types";

export interface ProfileProvider {
  getProfile(userId: string): Promise<UserProfile | undefined>;
  saveEvent?(args: { userId: string; query: string; commandId: string }): Promise<void>;
}
