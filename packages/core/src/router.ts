import { DEFAULT_DIM, dot, embed } from "./embed";
import {
  CommandDef,
  EmbedOptions,
  IntentRouterOptions,
  RankedCommand,
  UserProfile,
  ScoreSignal,
  CommandId,
  IndexedCommand,
  SignalContribution,
  ScoreSignalResult,
  PostRankStage,
} from "./types";
import { defaultSignals } from "./signals";
import {
  bumpAffinity,
  cloneProfile,
  learnIntoProfile,
  mergeProfiles,
} from "./profile";
import { embedCommand } from "./utils";

export type RankOptions<TMeta = unknown> = {
  query: string;
  profile?: UserProfile<TMeta>;
  limit?: number;
  useLocalProfile?: boolean;
};

type RankedInternal<TData = unknown> = RankedCommand<TData> & {
  _index: number;
};

function normalizeLimit(limit: number | undefined, fallback = 10): number {
  if (limit == null || !Number.isFinite(limit)) return fallback;
  return Math.max(0, Math.floor(limit));
}

function isBlankQuery(query: string): boolean {
  return query.trim().length === 0;
}

function normalizeSignalResult(
  result: number | ScoreSignalResult,
  index: number
): SignalContribution {
  if (typeof result === "number") {
    return {
      name: `signal_${index}`,
      score: result,
    };
  }

  return {
    name: result.name ?? `signal_${index}`,
    score: result.score,
  };
}

export class IntentRouter<TData = unknown, TMeta = unknown> {
  private readonly dimension: number;
  private readonly embedOptions: EmbedOptions;
  private readonly signals: readonly ScoreSignal<TData, TMeta>[];
  private readonly postRankStages: readonly PostRankStage<TData, TMeta>[];
  private indexed: IndexedCommand<TData>[];
  private commandIds: Set<CommandId>;
  private localProfile: UserProfile<TMeta> = {};

  constructor(options: IntentRouterOptions<TData, TMeta>) {
    this.dimension = options.dimension ?? DEFAULT_DIM;
    this.embedOptions = options.embedOptions ?? {};
    this.signals =
      options.signals ?? (defaultSignals as readonly ScoreSignal<TData, TMeta>[]);
    this.postRankStages = options.postRankStages ?? [];
    this.indexed = [];
    this.commandIds = new Set();
    this.setCommands(options.commands);
  }

  rank(args: RankOptions<TMeta>): RankedCommand<TData>[] {
    const { query, profile, useLocalProfile = false } = args;
    const limit = normalizeLimit(args.limit);
    const blankQuery = isBlankQuery(query);

    const queryVec = blankQuery
      ? new Float32Array(this.dimension)
      : embed(query, this.dimension, this.embedOptions);

    const mergedProfile = useLocalProfile
      ? this.validateProfileDimensions(mergeProfiles(this.localProfile, profile))
      : this.validateProfileDimensions(profile);

    const initialResults: RankedInternal<TData>[] = this.indexed.map((item) => {
      const baseScore = blankQuery ? 0 : dot(queryVec, item.vec);

      const signals = this.signals.map((signal, index) =>
        normalizeSignalResult(
          signal({
            query,
            isBlankQuery: blankQuery,
            queryVec,
            command: item.command,
            commandVec: item.vec,
            baseScore,
            profile: mergedProfile,
          }),
          index
        )
      );

      const signalBoost = signals.reduce((sum, s) => sum + s.score, 0);
      const finalScore = baseScore + signalBoost;

      return {
        id: item.command.id,
        score: finalScore,
        breakdown: {
          baseScore,
          signalBoost,
          finalScore,
          signals,
        },
        command: item.command,
        _index: item.index,
      };
    });

    const sorted = initialResults.sort(
      (a, b) => b.score - a.score || a._index - b._index
    );

    const postRankInput: RankedCommand<TData>[] = sorted.map(({ _index, ...result }) => result);

    const postRanked = this.postRankStages.reduce(
      (results, stage) =>
        stage({
          query,
          isBlankQuery: blankQuery,
          profile: mergedProfile,
          results,
        }),
      postRankInput
    );

    return postRanked.slice(0, limit);
  }

  learnLocal(args: {
    query: string;
    commandId: CommandId;
    affinityDelta?: number;
  }): UserProfile<TMeta> {
    const { query, commandId, affinityDelta = 1 } = args;

    if (!this.commandIds.has(commandId)) {
      throw new Error(`Unknown commandId: ${commandId}`);
    }

    const blankQuery = isBlankQuery(query);

    this.localProfile = blankQuery
      ? bumpAffinity({
          profile: this.localProfile,
          commandId,
          affinityDelta,
        })
      : learnIntoProfile({
          profile: this.localProfile,
          commandId,
          queryVec: embed(query, this.dimension, this.embedOptions),
          affinityDelta,
        });

    return cloneProfile(this.localProfile);
  }

  exportProfile(): UserProfile<TMeta> {
    return cloneProfile(this.localProfile);
  }

  loadProfile(profile?: UserProfile<TMeta>): UserProfile<TMeta> {
    const normalized = cloneProfile(profile ?? {});
    this.localProfile = this.validateProfileDimensions(normalized);
    return cloneProfile(this.localProfile);
  }

  resetProfile(): UserProfile<TMeta> {
    this.localProfile = {};
    return cloneProfile(this.localProfile);
  }

  setCommands(commands: readonly CommandDef<TData>[]): void {
    this.indexed = commands.map((command, index) => ({
      index,
      command,
      vec: embedCommand(command, this.dimension, this.embedOptions),
    }));
    this.commandIds = new Set(commands.map((command) => command.id));
  }

  addCommands(commands: readonly CommandDef<TData>[]): void {
    const startIndex = this.indexed.length;

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      this.indexed.push({
        index: startIndex + i,
        command,
        vec: embedCommand(command, this.dimension, this.embedOptions),
      });
      this.commandIds.add(command.id);
    }
  }

  private validateProfileDimensions(
    profile?: UserProfile<TMeta>
  ): UserProfile<TMeta> {
    if (!profile) return {};

    if (profile.centroids) {
      for (const [commandId, vec] of Object.entries(profile.centroids)) {
        if (vec.length !== this.dimension) {
          throw new Error(
            `Profile centroid dimension mismatch for command "${commandId}". Expected ${this.dimension}, got ${vec.length}.`
          );
        }
      }
    }

    return profile;
  }
}