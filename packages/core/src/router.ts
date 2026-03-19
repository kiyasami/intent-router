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
  ProfileMetadata,
} from "./types";
import { defaultSignals } from "./signals";
import { cloneProfile, ProfileManager } from "./profile";
import { embedCommand } from "./utils";

export type RankOptions<TMeta extends ProfileMetadata = ProfileMetadata> = {
  query: string;
  profile?: UserProfile<TMeta>;
  limit?: number;
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

export class IntentRouter<
  TData = unknown,
  TMeta extends ProfileMetadata = ProfileMetadata
> {
  private readonly dimension: number;
  private readonly embedOptions: EmbedOptions;
  private readonly signals: readonly ScoreSignal<TData, TMeta>[];
  private readonly postRankStages: readonly PostRankStage<TData, TMeta>[];
  private indexed: IndexedCommand<TData>[];
  private commandIds: Set<CommandId>;

  constructor(options: IntentRouterOptions<TData, TMeta>) {
    this.dimension = options.embedOptions?.dimension ?? options.dimension ?? DEFAULT_DIM;
    this.embedOptions = {
      ...(options.embedOptions ?? {}),
      dimension: this.dimension,
    };
    this.signals =
      options.signals ?? (defaultSignals as readonly ScoreSignal<TData, TMeta>[]);
    this.postRankStages = options.postRankStages ?? [];
    this.indexed = [];
    this.commandIds = new Set();
    this.setCommands(options.commands);
  }

  rank(args: RankOptions<TMeta>): RankedCommand<TData>[] {
    const { query, profile } = args;
    const safeProfile = cloneProfile(profile);
    const limit = normalizeLimit(args.limit);
    const blankQuery = isBlankQuery(query);

    const queryVec = blankQuery
      ? new Float32Array(this.dimension)
      : embed(query, this.dimension, this.embedOptions);

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
            profile: safeProfile,
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

    const postRankInput: RankedCommand<TData>[] = sorted.map(
      ({ _index, ...result }) => result
    );

    const postRanked = this.postRankStages.reduce(
      (results, stage) =>
        stage({
          query,
          isBlankQuery: blankQuery,
          profile,
          results,
        }),
      postRankInput
    );

    return postRanked.slice(0, limit);
  }

  personalize(
    args: {
      userId: string;
      query: string;
      commandId: CommandId;
      affinityDelta?: number;
    },
    profileManager: ProfileManager<TMeta>
  ): void {
    const { userId, query, commandId, affinityDelta = 1 } = args;

    if (!this.commandIds.has(commandId)) {
      throw new Error(`Unknown commandId: ${commandId}`);
    }

    profileManager.learnLocal(
      {
        userId,
        query,
        commandId,
        affinityDelta,
      },
      {
        blankQuery: isBlankQuery(query),
        dimension: this.dimension,
        embedOptions: this.embedOptions,
      }
    );
  }

  getDimension(): number {
    return this.dimension;
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
}
