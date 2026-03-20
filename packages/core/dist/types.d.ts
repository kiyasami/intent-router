export declare type CommandId = string;
export declare type VectorLike = Float32Array | number[];
export declare type JsonPrimitive = string | number | boolean | null;
export declare type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export declare type JsonObject = {
    [key: string]: JsonValue | undefined;
};
export declare type ProfileMetadata = JsonObject;
export declare type CommandDef<TData = unknown> = {
    id: CommandId;
    title: string;
    synonyms?: readonly string[];
    keywords?: readonly string[];
    group?: string;
    data?: TData;
};
export declare type CommandProfile = {
    centroid?: VectorLike;
    count?: number;
    affinity?: number;
};
export declare type UserProfile<TMeta extends ProfileMetadata = ProfileMetadata> = {
    centroids?: Record<CommandId, VectorLike>;
    counts?: Record<CommandId, number>;
    affinities?: Record<CommandId, number>;
    metadata?: TMeta;
};
export declare type SignalContribution = {
    name: string;
    score: number;
};
export declare type ScoreBreakdown = {
    baseScore: number;
    signalBoost: number;
    finalScore: number;
    signals: SignalContribution[];
};
export declare type RankedCommand<TData = unknown> = {
    id: CommandId;
    score: number;
    breakdown: ScoreBreakdown;
    command: CommandDef<TData>;
};
export declare type EmbedOptions = {
    dimension?: number;
    wordWeight?: number;
    charWeight?: number;
    charN?: number;
    stopWords?: readonly string[];
};
export declare type SignalWeights = {
    centroidWeight?: number;
    affinityWeight?: number;
    affinityCap?: number;
    pinnedWeight?: number;
    routeParamWeight?: number;
};
export declare type RouteQueryValue = string | number | boolean | null | undefined;
export declare type RouteParamKind = "number" | "string" | "identifier" | "po_number" | "item_number" | "sku" | "invoice_number" | "email" | "phone";
export declare type RouteParamMatchSource = "custom" | "pattern" | "kind";
export declare type RouteParamMatch = {
    value: string;
    kind?: RouteParamKind;
    score?: number;
    start?: number;
    end?: number;
};
export declare type RouteParamParser = (rawValue: string) => RouteQueryValue;
export declare type RouteParamValidator = (rawValue: string) => boolean;
export declare type RouteParamMatchContext = {
    query: string;
    queryTokens: readonly string[];
};
export declare type RouteParamMatcher = (args: RouteParamMatchContext & {
    spec: RouteParamSpec;
}) => RouteParamMatch | readonly RouteParamMatch[] | undefined;
export declare type RouteParamSpec = {
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
export declare type RouteTarget = {
    pathname: string;
    query?: Record<string, RouteQueryValue>;
    hash?: string;
};
export declare type RouteCommandData = {
    route: RouteTarget;
    params?: readonly RouteParamSpec[];
    routeLabel?: string;
};
export declare type RouteCommandDef<TData extends RouteCommandData = RouteCommandData> = CommandDef<TData>;
export declare type ResolvedRouteParam = {
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
export declare type RouteResolution = {
    pathname: string;
    query: Record<string, RouteQueryValue>;
    hash?: string;
    href: string;
    label: string;
    params: ResolvedRouteParam[];
};
export declare type ScoreSignalArgs<TData = unknown, TMeta extends ProfileMetadata = ProfileMetadata> = {
    query: string;
    isBlankQuery: boolean;
    queryVec: Float32Array;
    command: CommandDef<TData>;
    commandVec: Float32Array;
    baseScore: number;
    profile?: UserProfile<TMeta>;
};
export declare type ScoreSignalResult = {
    score: number;
    name?: string;
};
export declare type ScoreSignal<TData = unknown, TMeta extends ProfileMetadata = ProfileMetadata> = (args: ScoreSignalArgs<TData, TMeta>) => number | ScoreSignalResult;
export declare type IntentRouterOptions<TData = unknown, TMeta extends ProfileMetadata = ProfileMetadata> = {
    commands: readonly CommandDef<TData>[];
    dimension?: number;
    embedOptions?: EmbedOptions;
    signalWeights?: SignalWeights;
    signals?: readonly ScoreSignal<TData, TMeta>[];
    postRankStages?: readonly PostRankStage<TData, TMeta>[];
};
export declare type IndexedCommand<TData = unknown> = {
    index: number;
    command: CommandDef<TData>;
    vec: Float32Array;
};
export declare type EmbedGroup = {
    prefix: string;
    text: string;
    weight: number;
};
export declare type PostRankArgs<TData = unknown, TMeta extends ProfileMetadata = ProfileMetadata> = {
    query: string;
    isBlankQuery: boolean;
    profile?: UserProfile<TMeta>;
    results: RankedCommand<TData>[];
};
export declare type PostRankStage<TData = unknown, TMeta extends ProfileMetadata = ProfileMetadata> = (args: PostRankArgs<TData, TMeta>) => RankedCommand<TData>[];
