export type CommandId = string;
export type VectorLike = Float32Array | number[];
export type CommandDef<TData = unknown> = {
  id: CommandId;
  title: string;
  synonyms?: readonly string[];
  keywords?: readonly string[];
  group?: string;
  data?: TData;
};
export type CommandProfile = {
  centroid?: VectorLike;
  count?: number;
  affinity?: number;
};
export type UserProfile<TMeta = unknown> = {
  centroids?: Record<CommandId, VectorLike>;
  counts?: Record<CommandId, number>;
  affinities?: Record<CommandId, number>;
  metadata?: TMeta;
};

export type SignalContribution = {
  name: string;
  score: number;
};

export type ScoreBreakdown = {
  baseScore: number;
  signalBoost: number;
  finalScore: number;
  signals: SignalContribution[];
};

export type RankedCommand<TData = unknown> = {
  id: CommandId;
  score: number;
  breakdown: ScoreBreakdown;
  command: CommandDef<TData>;
};

export type EmbedOptions = {
  dimension?: number;
  wordWeight?: number;
  charWeight?: number;
  charN?: number;
};

export type ScoreSignalArgs<TData = unknown, TMeta = unknown> = {
  query: string;
  isBlankQuery: boolean;
  queryVec: Float32Array;
  command: CommandDef<TData>;
  commandVec: Float32Array;
  baseScore: number;
  profile?: UserProfile<TMeta>;
};
export type ScoreSignalResult = {
  score: number;
  name?: string;
};

export type ScoreSignal<TData = unknown, TMeta = unknown> = (
  args: ScoreSignalArgs<TData, TMeta>
) => number | ScoreSignalResult;

export type IntentRouterOptions<TData = unknown, TMeta = unknown> = {
  commands: readonly CommandDef<TData>[];
  dimension?: number;
  embedOptions?: EmbedOptions;
  signals?: readonly ScoreSignal<TData, TMeta>[];
  postRankStages?: readonly PostRankStage<TData, TMeta>[];
};

export type IndexedCommand<TData = unknown> = {
  index: number;
  command: CommandDef<TData>;
  vec: Float32Array;
};

export type EmbedGroup = {
  prefix: string;
  text: string;
  weight: number;
};

export type PostRankArgs<TData = unknown, TMeta = unknown> = {
  query: string;
  isBlankQuery: boolean;
  profile?: UserProfile<TMeta>;
  results: RankedCommand<TData>[];
};

export type PostRankStage<TData = unknown, TMeta = unknown> = (
  args: PostRankArgs<TData, TMeta>
) => RankedCommand<TData>[];

