export type CommandDef = {
  id: string;
  title: string;
  synonyms?: string[];
  keywords?: string[];
  group?: string;
  data?: Record<string, unknown>;
};

export type UserProfile = {
  centroids?: Record<string, number[]>;
  counts?: Record<string, number>;
  affinities?: Record<string, number>;
  metadata?: Record<string, unknown>;
};

export type RankedCommand = {
  id: string;
  score: number;
  breakdown: {
    baseScore: number;
    signalBoost: number;
  };
  command: CommandDef;
};

export type EmbedOptions = {
  dimension?: number;
  wordWeight?: number;
  charWeight?: number;
  charN?: number;
};

export type ScoreSignalArgs = {
  query: string;
  queryVec: Float32Array;
  command: CommandDef;
  commandVec: Float32Array;
  baseScore: number;
  profile?: UserProfile;
};

export type ScoreSignal = (args: ScoreSignalArgs) => number;

export type IntentRouterOptions = {
  commands: CommandDef[];
  dimension?: number;
  embedOptions?: EmbedOptions;
  signals?: ScoreSignal[];
};
