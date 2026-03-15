import { ProfileProvider, UserProfile } from "@intent-router/core";
export function pretty(obj: unknown) {
  return JSON.stringify(obj, null, 2);
}

export function scoreClass(score: number) {
  if (score >= 0.7) return "good";
  if (score >= 0.4) return "mid";
  return "low";
}


export class InMemoryProfileProvider implements ProfileProvider {
  private externalProfile = new Map<string, UserProfile>();

  async getProfile(userId: string): Promise<UserProfile | undefined> {
    return this.externalProfile.get(userId);
  }

  async saveEvent(args: { userId: string; query: string; commandId: string }): Promise<void> {
    console.log("saveEvent", args);
  }

  setProfile(userId: string, profile: UserProfile): void {
    this.externalProfile.set(userId, profile);
  }
}