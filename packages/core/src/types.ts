export type CommandId = string;
export type VectorLike = Float32Array | number[];
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | JsonObject
  | JsonValue[];
export type JsonObject = {
  [key: string]: JsonValue | undefined;
};
export type ProfileMetadata = JsonObject;
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
export type UserProfile<TMeta extends ProfileMetadata = ProfileMetadata> = {
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
  stopWords?: readonly string[];
};

export type RouteQueryValue = string | number | boolean | null | undefined;

export type RouteParamKind =
  | "number"
  | "string"
  | "identifier"
  | "po_number"
  | "item_number"
  | "sku"
  | "invoice_number"
  | "email"
  | "phone";

export type RouteParamMatchSource = "custom" | "pattern" | "kind";

export type RouteParamMatch = {
  value: string;
  kind?: RouteParamKind;
  score?: number;
  start?: number;
  end?: number;
};

export type RouteParamParser = (rawValue: string) => RouteQueryValue;
export type RouteParamValidator = (rawValue: string) => boolean;

export type RouteParamMatchContext = {
  query: string;
  queryTokens: readonly string[];
};

export type RouteParamMatcher = (
  args: RouteParamMatchContext & {
    spec: RouteParamSpec;
  }
) => RouteParamMatch | readonly RouteParamMatch[] | undefined;

export type RouteParamSpec = {
  name: string;
  kind: RouteParamKind | readonly RouteParamKind[];
  required?: boolean;
  queryKey?: string;
  pathKey?: string;
  hints?: readonly string[];
  specificity?: number;
  pattern?: RegExp;
  match?: RouteParamMatcher;
  parse?: RouteParamParser;
  validate?: RouteParamValidator;
};

export type RouteTarget = {
  pathname: string;
  query?: Record<string, RouteQueryValue>;
  hash?: string;
};

export type RouteCommandData = {
  route: RouteTarget;
  params?: readonly RouteParamSpec[];
  routeLabel?: string;
};

export type RouteCommandDef<
  TData extends RouteCommandData = RouteCommandData
> = CommandDef<TData>;

export type ResolvedRouteParam = {
  name: string;
  value: string;
  routeValue: RouteQueryValue;
  kind: RouteParamKind;
  score: number;
  specificity: number;
  hintMatched: boolean;
  source: RouteParamMatchSource;
  queryKey?: string;
  pathKey?: string;
};

export type RouteResolution = {
  pathname: string;
  query: Record<string, RouteQueryValue>;
  hash?: string;
  href: string;
  label: string;
  params: ResolvedRouteParam[];
};

export type ScoreSignalArgs<
  TData = unknown,
  TMeta extends ProfileMetadata = ProfileMetadata
> = {
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

export type ScoreSignal<
  TData = unknown,
  TMeta extends ProfileMetadata = ProfileMetadata
> = (
  args: ScoreSignalArgs<TData, TMeta>
) => number | ScoreSignalResult;

export type IntentRouterOptions<
  TData = unknown,
  TMeta extends ProfileMetadata = ProfileMetadata
> = {
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

export type PostRankArgs<
  TData = unknown,
  TMeta extends ProfileMetadata = ProfileMetadata
> = {
  query: string;
  isBlankQuery: boolean;
  profile?: UserProfile<TMeta>;
  results: RankedCommand<TData>[];
};

export type PostRankStage<
  TData = unknown,
  TMeta extends ProfileMetadata = ProfileMetadata
> = (
  args: PostRankArgs<TData, TMeta>
) => RankedCommand<TData>[];

