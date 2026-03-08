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
};

export type RankedCommand = {
  id: string;
  score: number;
  baseScore: number;
  profileBoost: number;
  command: CommandDef;
};

export type IntentRouterOptions = {
  dimension?: number;
  commands: CommandDef[];
};
