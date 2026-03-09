import { DEFAULT_DIM, dot, embed } from "./embed";
import { CommandDef, IntentRouterOptions, RankedCommand, UserProfile, ScoreSignal } from "./types";
import { defaultSignals } from "./signals";
import { cloneProfile, learnIntoProfile } from "./profile";

// internal representation of a command with its embedded vector
type IndexedCommand = {
  command: CommandDef;
  vec: Float32Array;
};

function buildCommandText(command: CommandDef): string {
  return [command.title, ...(command.synonyms ?? []), ...(command.keywords ?? [])]
    .filter(Boolean)
    .join(" ");
}

function mergeProfiles(
  local?: UserProfile,
  external?: UserProfile
): UserProfile {
  if (!local && !external) return {};
  const out: UserProfile = {};
  if (local) {
    if (local.centroids) out.centroids = { ...local.centroids };
    if (local.counts) out.counts = { ...local.counts };
    if (local.affinities) out.affinities = { ...local.affinities };
    if (local.metadata) out.metadata = { ...local.metadata };
  }
  if (external) {
    if (external.centroids) out.centroids = { ...out.centroids, ...external.centroids };
    if (external.counts) out.counts = { ...out.counts, ...external.counts };
    if (external.affinities) out.affinities = { ...out.affinities, ...external.affinities };
    if (external.metadata) out.metadata = { ...out.metadata, ...external.metadata };
  }
  return out;
}

export class IntentRouter {
  private dimension: number;
  private embedOptions = {};
  private signals: ScoreSignal[];
  private indexed: IndexedCommand[];
  private localProfile: UserProfile = {};

  constructor(options: IntentRouterOptions) {
    this.dimension = options.dimension ?? DEFAULT_DIM;
    if (options.embedOptions) this.embedOptions = options.embedOptions;
    this.signals = options.signals ?? [...defaultSignals];

    this.indexed = options.commands.map((command) => ({
      command,
      vec: embed(buildCommandText(command), this.dimension, this.embedOptions),
    }));
  }

  /**
   * Rank a query against the command set. `profile` is an external profile
   * (e.g. fetched from backend). If `useLocalProfile` is true we merge the
   * router's in-memory local profile with the external one (external keys
   * take precedence).
   */
  rank(args: {
    query: string;
    profile?: UserProfile;
    limit?: number;
    useLocalProfile?: boolean;
  }): RankedCommand[] {
    const { query, profile, limit = 10, useLocalProfile = false } = args;
    const queryVector = embed(query, this.dimension, this.embedOptions);

    const mergedProfile = useLocalProfile
      ? mergeProfiles(this.localProfile, profile)
      : profile;

    const results = this.indexed.map((item) => {
      const baseScore = dot(queryVector, item.vec);
      const signalBoost = this.signals.reduce(
        (sum, sig) => sum + sig({
          query,
          queryVec: queryVector,
          command: item.command,
          commandVec: item.vec,
          baseScore,
          profile: mergedProfile,
        }),
        0
      );
      return {
        id: item.command.id,
        score: baseScore + signalBoost,
        breakdown: { baseScore, signalBoost },
        command: item.command,
      };
    });

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /* local profile learning and management */
  learnLocal(args: { query: string; commandId: string; affinityDelta?: number }) {
    const { query, commandId, affinityDelta = 1 } = args;
    const queryVec = embed(query, this.dimension, this.embedOptions);
    this.localProfile = learnIntoProfile({
      profile: this.localProfile,
      commandId,
      queryVec,
      affinityDelta,
    });
    return cloneProfile(this.localProfile);
  }

  exportProfile(): UserProfile {
    return cloneProfile(this.localProfile);
  }

  loadProfile(profile?: UserProfile) {
    this.localProfile = profile ? cloneProfile(profile) : {};
  }

  resetProfile() {
    this.localProfile = {};
  }
}
