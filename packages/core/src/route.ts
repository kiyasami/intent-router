import { normalizeText } from "./embed.js";
import {
  CommandDef,
  ResolvedRouteParam,
  RouteCommandDef,
  RouteCommandData,
  RouteParamFactoryOptions,
  RouteParamKind,
  RouteParamMatch,
  RouteParamMatchContext,
  RouteParamMatchSource,
  RouteParamMatcher,
  RouteParamSpec,
  RouteQueryValue,
  RouteResolution,
  RouteScoringOptions,
  RouteTarget,
} from "./types.js";

type PrimitiveParamKind = "number" | "string" | "identifier";

type QueryToken = {
  original: string;
  normalized: string;
  index: number;
};

type ParamCandidate = {
  value: string;
  normalizedValue: string;
  kinds: PrimitiveParamKind[];
  index: number;
};

type NormalizedMatch = ResolvedRouteParam & {
  signature: string;
};

type ResolvedRouteScoringOptions = Required<Omit<RouteScoringOptions, "extractorStopWords">> & {
  extractorStopWords: readonly string[];
};

export const defaultRouteScoringOptions: ResolvedRouteScoringOptions = {
  extractorStopWords: [
    "account",
    "by",
    "check",
    "find",
    "for",
    "history",
    "in",
    "is",
    "lookup",
    "manage",
    "my",
    "on",
    "open",
    "order",
    "orders",
    "profile",
    "report",
    "reports",
    "search",
    "settings",
    "show",
    "track",
    "view",
    "where",
  ],
  signalCap: 0.24,
  hintBoost: 0.06,
  hintSpecificityBonus: 0.01,
  hintMatchedBonus: 0.015,
  kindMatchBaseScore: 0.05,
  specializedKindMatchBonus: 0.02,
  numberKindMatchBonus: 0.02,
  identifierKindMatchBonus: 0.015,
  customSourceBaseScore: 0.14,
  patternSourceBaseScore: 0.1,
  kindSpecificity: 0.008,
  identifierSpecificity: 0.012,
  numberSpecificity: 0.01,
  specializedKindSpecificity: 0.04,
  patternSpecificityBonus: 0.015,
  customSpecificityBonus: 0.03,
  pathSpecificityBonus: 0.01,
  valueLengthBonusThreshold: 5,
  valueLengthBonusFactor: 0.002,
  valueLengthBonusCap: 0.02,
};

const DEFAULT_PO_LABELS = ["po", "purchase order"] as const;
const DEFAULT_PO_HINTS = ["po", "purchase order"] as const;
const DEFAULT_SKU_LABELS = [
  "sku",
  "product code",
  "part number",
  "catalog number",
] as const;
const DEFAULT_SKU_HINTS = DEFAULT_SKU_LABELS;
const DEFAULT_INVOICE_LABELS = ["invoice", "inv"] as const;
const DEFAULT_INVOICE_HINTS = DEFAULT_INVOICE_LABELS;
const DEFAULT_ITEM_NUMBER_LABELS = ["item", "item number", "line item"] as const;
const DEFAULT_ITEM_NUMBER_HINTS = DEFAULT_ITEM_NUMBER_LABELS;
const DEFAULT_EMAIL_HINTS = ["email", "mail"] as const;
const DEFAULT_PHONE_HINTS = ["phone", "call", "mobile", "cell"] as const;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toGlobalRegex(pattern: RegExp): RegExp {
  const flags = pattern.flags.includes("g")
    ? pattern.flags
    : `${pattern.flags}g`;
  return new RegExp(pattern.source, flags);
}

function resolveRouteScoringOptions(
  options: RouteScoringOptions = {}
): ResolvedRouteScoringOptions {
  return {
    ...defaultRouteScoringOptions,
    ...options,
    extractorStopWords:
      options.extractorStopWords ?? defaultRouteScoringOptions.extractorStopWords,
  };
}

function createStopWordSet(words: readonly string[]): Set<string> {
  return new Set(
    words
      .flatMap((word) => tokenizeQuery(word))
      .map((token) => token.normalized)
      .filter(Boolean)
  );
}

function tokenizeQuery(query: string): QueryToken[] {
  const matches = query.match(/[A-Za-z0-9@._+\-()]+/g) ?? [];

  return matches.map((token, index) => ({
    original: token,
    normalized: normalizeText(token),
    index,
  }));
}

function classifyCandidateKinds(token: string): PrimitiveParamKind[] {
  if (/^\d+$/.test(token)) {
    return ["number", "identifier", "string"];
  }

  if (/[a-z]/i.test(token) && /\d/.test(token)) {
    return ["identifier", "string"];
  }

  return ["string"];
}

function getParamCandidates(
  query: string,
  stopWords: Set<string>
): ParamCandidate[] {
  return tokenizeQuery(query)
    .filter(
      (token) =>
        token.normalized.length >= 2 &&
        !stopWords.has(token.normalized)
    )
    .map((token) => ({
      value: token.original,
      normalizedValue: token.normalized,
      kinds: classifyCandidateKinds(token.normalized),
      index: token.index,
    }));
}

function getPrimitiveKinds(kind: RouteParamKind): PrimitiveParamKind[] {
  switch (kind) {
    case "number":
      return ["number"];
    case "email":
    case "phone":
    case "string":
      return ["string", "identifier"];
    case "identifier":
    case "po_number":
    case "item_number":
    case "sku":
    case "invoice_number":
      return ["identifier", "number"];
  }
}

function toKindList(
  kind: RouteParamKind | readonly RouteParamKind[]
): readonly RouteParamKind[] {
  return Array.isArray(kind) ? kind : [kind];
}

function getDefaultKind(spec: RouteParamSpec): RouteParamKind {
  return toKindList(spec.kind)[0];
}

function tokenizeHints(hints?: readonly string[]): Set<string> {
  return new Set(
    (hints ?? [])
      .flatMap((hint) => tokenizeQuery(hint))
      .map((token) => token.normalized)
      .filter(Boolean)
  );
}

function getQueryTokens(query: string): string[] {
  return tokenizeQuery(query).map((token) => token.normalized);
}

function getQueryTokenSet(queryTokens: readonly string[]): Set<string> {
  return new Set(queryTokens);
}

function withHintBoost(
  score: number,
  hints: Set<string>,
  queryTokens: Set<string>,
  scoring: ResolvedRouteScoringOptions
): number {
  if (hints.size > 0 && [...hints].some((hint) => queryTokens.has(hint))) {
    return score + scoring.hintBoost;
  }

  return score;
}

function hasHintMatch(
  hints: Set<string>,
  queryTokens: Set<string>
): boolean {
  return hints.size > 0 && [...hints].some((hint) => queryTokens.has(hint));
}

function isSpecializedKind(kind: RouteParamKind): boolean {
  return !["number", "string", "identifier"].includes(kind);
}

function getKindSpecificityWithOptions(
  kind: RouteParamKind,
  scoring: ResolvedRouteScoringOptions
): number {
  if (isSpecializedKind(kind)) return scoring.specializedKindSpecificity;
  if (kind === "identifier") return scoring.identifierSpecificity;
  if (kind === "number") return scoring.numberSpecificity;
  return scoring.kindSpecificity;
}

function getSpecSpecificity(
  spec: RouteParamSpec,
  scoring: ResolvedRouteScoringOptions
): number {
  if (typeof spec.specificity === "number") {
    return spec.specificity;
  }

  const kinds = toKindList(spec.kind);
  const kindSpecificity = kinds.length === 1
    ? getKindSpecificityWithOptions(kinds[0], scoring)
    : Math.max(...kinds.map((kind) => getKindSpecificityWithOptions(kind, scoring))) * 0.5;
  const patternSpecificity = spec.pattern ? scoring.patternSpecificityBonus : 0;
  const customSpecificity = spec.match ? scoring.customSpecificityBonus : 0;
  const pathSpecificity = spec.pathKey ? scoring.pathSpecificityBonus : 0;

  return kindSpecificity + patternSpecificity + customSpecificity + pathSpecificity;
}

function normalizeRouteValue(routeValue: RouteQueryValue): string {
  return routeValue == null ? "" : String(routeValue).trim();
}

function buildMatchSignature(match: RouteParamMatch, normalizedValue: string): string {
  if (typeof match.start === "number" || typeof match.end === "number") {
    return `${match.start ?? -1}:${match.end ?? -1}:${normalizedValue}`;
  }

  return normalizedValue;
}

function normalizeMatch(
  match: RouteParamMatch,
  source: RouteParamMatchSource,
  spec: RouteParamSpec,
  queryTokens: Set<string>,
  usedSignatures: Set<string>,
  scoring: ResolvedRouteScoringOptions
): NormalizedMatch | null {
  const rawValue = match.value.trim();
  if (!rawValue) return null;

  if (spec.validate && !spec.validate(rawValue)) {
    return null;
  }

  const routeValue = spec.parse ? spec.parse(rawValue) : rawValue;
  const normalizedRouteValue = normalizeRouteValue(routeValue);
  if (!normalizedRouteValue) return null;

  const signature = buildMatchSignature(match, normalizeText(normalizedRouteValue));
  if (usedSignatures.has(signature)) {
    return null;
  }

  const hints = tokenizeHints(spec.hints);
  const hintMatched = hasHintMatch(hints, queryTokens);
  const baseScore =
    match.score ??
    (
      source === "custom"
        ? scoring.customSourceBaseScore
        : source === "pattern"
          ? scoring.patternSourceBaseScore
          : scoring.kindMatchBaseScore
    );
  let score = withHintBoost(baseScore, hints, queryTokens, scoring);
  const specificity = getSpecSpecificity(spec, scoring);

  if (hintMatched && specificity > 0) {
    score += scoring.hintSpecificityBonus;
  }

  if (normalizedRouteValue.length >= scoring.valueLengthBonusThreshold) {
    score += Math.min(
      scoring.valueLengthBonusCap,
      normalizedRouteValue.length * scoring.valueLengthBonusFactor
    );
  }

  return {
    name: spec.name,
    value: rawValue,
    routeValue,
    kind: match.kind ?? getDefaultKind(spec),
    score,
    specificity,
    hintMatched,
    source,
    queryKey: spec.queryKey,
    pathKey: spec.pathKey,
    signature,
  };
}

function scoreCandidateForSpec(
  candidate: ParamCandidate,
  spec: RouteParamSpec,
  queryTokens: Set<string>,
  scoring: ResolvedRouteScoringOptions
): RouteParamMatch | null {
  let best: RouteParamMatch | null = null;
  const hints = tokenizeHints(spec.hints);

  for (const kind of toKindList(spec.kind)) {
    const acceptedKinds = getPrimitiveKinds(kind);
    if (!acceptedKinds.some((accepted) => candidate.kinds.includes(accepted))) {
      continue;
    }

    let score = scoring.kindMatchBaseScore;

    if (
      kind !== "string" &&
      kind !== "identifier" &&
      kind !== "number"
    ) {
      score += scoring.specializedKindMatchBonus;
    }

    if (kind === "number" && candidate.kinds.includes("number")) {
      score += scoring.numberKindMatchBonus;
    }

    if (kind === "identifier" && candidate.kinds.includes("identifier")) {
      score += scoring.identifierKindMatchBonus;
    }

    score = withHintBoost(score, hints, queryTokens, scoring);

    if (!best || score > (best.score ?? 0)) {
      best = { value: candidate.value, kind, score };
    }
  }

  return best;
}

function getMatchesFromPattern(spec: RouteParamSpec, query: string): RouteParamMatch[] {
  if (!spec.pattern) return [];

  const matches: RouteParamMatch[] = [];
  const regex = toGlobalRegex(spec.pattern);

  for (const match of query.matchAll(regex)) {
    const fullMatch = match[0];
    const value = match[1] ?? fullMatch;
    if (!value) continue;

    const start = typeof match.index === "number" ? match.index : undefined;
    const end = typeof start === "number" ? start + fullMatch.length : undefined;

    matches.push({
      value,
      start,
      end,
    });
  }

  return matches;
}

function toMatchArray(
  match: RouteParamMatch | readonly RouteParamMatch[] | undefined
): RouteParamMatch[] {
  if (!match) return [];
  return Array.isArray(match) ? [...match] : [match];
}

function getMatchesFromCustomMatcher(
  spec: RouteParamSpec,
  context: RouteParamMatchContext
): RouteParamMatch[] {
  if (!spec.match) return [];
  return toMatchArray(spec.match({ ...context, spec }));
}

function findBestNormalizedMatch(
  sourceMatches: readonly RouteParamMatch[],
  source: RouteParamMatchSource,
  spec: RouteParamSpec,
  queryTokens: Set<string>,
  usedSignatures: Set<string>,
  scoring: ResolvedRouteScoringOptions
): NormalizedMatch | null {
  let bestMatch: NormalizedMatch | null = null;

  for (const match of sourceMatches) {
    const normalized = normalizeMatch(
      match,
      source,
      spec,
      queryTokens,
      usedSignatures,
      scoring
    );
    if (!normalized) continue;

    if (!bestMatch || normalized.score > bestMatch.score) {
      bestMatch = normalized;
    }
  }

  return bestMatch;
}

function findBestMatchForSpec(
  spec: RouteParamSpec,
  query: string,
  queryTokens: readonly string[],
  candidates: readonly ParamCandidate[],
  usedSignatures: Set<string>,
  scoring: ResolvedRouteScoringOptions
): NormalizedMatch | null {
  const queryTokenSet = getQueryTokenSet(queryTokens);
  const context: RouteParamMatchContext = { query, queryTokens };

  const customMatch = findBestNormalizedMatch(
    getMatchesFromCustomMatcher(spec, context),
    "custom",
    spec,
    queryTokenSet,
    usedSignatures,
    scoring
  );
  if (customMatch) return customMatch;

  const patternMatch = findBestNormalizedMatch(
    getMatchesFromPattern(spec, query),
    "pattern",
    spec,
    queryTokenSet,
    usedSignatures,
    scoring
  );
  if (patternMatch) return patternMatch;

  return findBestNormalizedMatch(
    candidates
      .map((candidate) => scoreCandidateForSpec(candidate, spec, queryTokenSet, scoring))
      .filter((match): match is RouteParamMatch => Boolean(match)),
    "kind",
    spec,
    queryTokenSet,
    usedSignatures,
    scoring
  );
}

function resolvePathname(
  pathname: string,
  params: readonly ResolvedRouteParam[]
): string {
  let resolved = pathname;

  for (const param of params) {
    if (!param.pathKey) continue;
    resolved = resolved.replace(
      new RegExp(`:${param.pathKey}\\b`, "g"),
      encodeURIComponent(normalizeRouteValue(param.routeValue))
    );
  }

  return resolved;
}

function buildHref(
  pathname: string,
  query: Record<string, RouteQueryValue>,
  hash?: string
): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value == null) continue;
    searchParams.set(key, String(value));
  }

  const search = searchParams.toString();
  const hashPart = hash ? `#${hash.replace(/^#/, "")}` : "";

  return search.length > 0
    ? `${pathname}?${search}${hashPart}`
    : `${pathname}${hashPart}`;
}

export function isRouteCommandData(value: unknown): value is RouteCommandData {
  if (!value || typeof value !== "object") return false;
  return "route" in value;
}

export function resolveRouteParams(
  query: string,
  specs?: readonly RouteParamSpec[],
  options: RouteScoringOptions = {}
): ResolvedRouteParam[] {
  if (!specs || specs.length === 0) return [];

  const scoring = resolveRouteScoringOptions(options);
  const stopWords = createStopWordSet(scoring.extractorStopWords);
  const candidates = getParamCandidates(query, stopWords);
  const queryTokens = getQueryTokens(query);
  const usedSignatures = new Set<string>();
  const resolved: ResolvedRouteParam[] = [];

  for (const spec of specs) {
    const bestMatch = findBestMatchForSpec(
      spec,
      query,
      queryTokens,
      candidates,
      usedSignatures,
      scoring
    );

    if (!bestMatch) continue;

    usedSignatures.add(bestMatch.signature);
    const { signature, ...match } = bestMatch;
    resolved.push(match);
  }

  return resolved;
}

export function computeRouteParamBoost<TData = unknown>(
  command: CommandDef<TData>,
  query: string,
  options: RouteScoringOptions = {}
): number {
  if (!isRouteCommandData(command.data)) return 0;

  const scoring = resolveRouteScoringOptions(options);
  const matches = resolveRouteParams(query, command.data.params, scoring);
  if (matches.length === 0) return 0;

  const total = matches.reduce(
    (sum, match) =>
      sum +
      match.score +
      match.specificity +
      (match.hintMatched ? scoring.hintMatchedBonus : 0),
    0
  );
  return Math.min(scoring.signalCap, total);
}

export function resolveCommandRoute<TData = unknown>(
  command: CommandDef<TData>,
  query: string,
  options: RouteScoringOptions = {}
): RouteResolution | undefined {
  if (!isRouteCommandData(command.data)) return undefined;

  const routeData = command.data;
  const params = resolveRouteParams(query, routeData.params, options);
  const queryValues: Record<string, RouteQueryValue> = {
    ...(routeData.route.query ?? {}),
  };

  for (const param of params) {
    if (param.queryKey) {
      queryValues[param.queryKey] = param.routeValue;
    } else if (!param.pathKey) {
      queryValues[param.name] = param.routeValue;
    }
  }

  const pathname = resolvePathname(routeData.route.pathname, params);
  const labelSuffix =
    params.length > 0
      ? ` ${params.map((param) => param.value).join(" ")}`
      : "";
  const label = `${routeData.routeLabel ?? command.title}${labelSuffix}`;

  return {
    pathname,
    query: queryValues,
    hash: routeData.route.hash,
    href: buildHref(pathname, queryValues, routeData.route.hash),
    label,
    params,
  };
}

export function createRouteCommandData(
  route: RouteTarget,
  params?: readonly RouteParamSpec[],
  routeLabel?: string
): RouteCommandData {
  return { route, params, routeLabel };
}

export function defineRouteCommand<
  TData extends RouteCommandData = RouteCommandData
>(command: RouteCommandDef<TData>): RouteCommandDef<TData> {
  return command;
}

function createLabelPattern(
  labels: readonly string[],
  valuePattern: string
): RegExp {
  const labelPattern = labels.map(escapeRegex).join("|");
  return new RegExp(
    `\\b(?:${labelPattern})[\\s:#-]*(${valuePattern})\\b`,
    "gi"
  );
}

function mergeFactoryValues(
  defaults: readonly string[],
  custom: readonly string[] | undefined,
  includeDefaults = true
): readonly string[] {
  const merged = includeDefaults
    ? [...defaults, ...(custom ?? [])]
    : [...(custom ?? [])];

  const deduped = [...new Set(merged.filter(Boolean))];
  return deduped.length > 0 ? deduped : [...defaults];
}

export const routeParamMatchers = {
  poNumber(options: RouteParamFactoryOptions = {}): RouteParamSpec {
    const labels = mergeFactoryValues(
      DEFAULT_PO_LABELS,
      options.labels,
      options.includeDefaultLabels !== false
    );
    const hints = mergeFactoryValues(
      DEFAULT_PO_HINTS,
      options.hints,
      options.includeDefaultHints !== false
    );

    return {
      name: options.name ?? "po",
      kind: "po_number",
      required: options.required,
      queryKey: options.queryKey ?? "po",
      pathKey: options.pathKey,
      hints,
      parse: options.parse,
      validate: options.validate,
      pattern:
        options.pattern ??
        createLabelPattern(labels, "[A-Za-z0-9-]+"),
    };
  },

  sku(options: RouteParamFactoryOptions = {}): RouteParamSpec {
    const labels = mergeFactoryValues(
      DEFAULT_SKU_LABELS,
      options.labels,
      options.includeDefaultLabels !== false
    );
    const hints = mergeFactoryValues(
      DEFAULT_SKU_HINTS,
      options.hints,
      options.includeDefaultHints !== false
    );

    return {
      name: options.name ?? "sku",
      kind: "sku",
      required: options.required,
      queryKey: options.queryKey ?? "sku",
      pathKey: options.pathKey,
      hints,
      parse: options.parse,
      validate: options.validate,
      pattern:
        options.pattern ??
        createLabelPattern(labels, "[A-Za-z0-9-]+"),
    };
  },

  invoiceNumber(options: RouteParamFactoryOptions = {}): RouteParamSpec {
    const labels = mergeFactoryValues(
      DEFAULT_INVOICE_LABELS,
      options.labels,
      options.includeDefaultLabels !== false
    );
    const hints = mergeFactoryValues(
      DEFAULT_INVOICE_HINTS,
      options.hints,
      options.includeDefaultHints !== false
    );

    return {
      name: options.name ?? "invoice",
      kind: "invoice_number",
      required: options.required,
      queryKey: options.queryKey ?? "invoice",
      pathKey: options.pathKey,
      hints,
      parse: options.parse,
      validate: options.validate,
      pattern:
        options.pattern ??
        createLabelPattern(labels, "[A-Za-z0-9-]+"),
    };
  },

  itemNumber(options: RouteParamFactoryOptions = {}): RouteParamSpec {
    const labels = mergeFactoryValues(
      DEFAULT_ITEM_NUMBER_LABELS,
      options.labels,
      options.includeDefaultLabels !== false
    );
    const hints = mergeFactoryValues(
      DEFAULT_ITEM_NUMBER_HINTS,
      options.hints,
      options.includeDefaultHints !== false
    );

    return {
      name: options.name ?? "item",
      kind: "item_number",
      required: options.required,
      queryKey: options.queryKey ?? "item",
      pathKey: options.pathKey,
      hints,
      parse: options.parse,
      validate: options.validate,
      pattern:
        options.pattern ??
        createLabelPattern(labels, "[A-Za-z0-9-]+"),
    };
  },

  email(options: RouteParamFactoryOptions = {}): RouteParamSpec {
    const hints = mergeFactoryValues(
      DEFAULT_EMAIL_HINTS,
      options.hints,
      options.includeDefaultHints !== false
    );

    return {
      name: options.name ?? "email",
      kind: "email",
      required: options.required,
      queryKey: options.queryKey ?? "email",
      pathKey: options.pathKey,
      hints,
      pattern:
        options.pattern ??
        /\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/gi,
      parse: options.parse,
      validate:
        options.validate ??
        ((rawValue) => /\S+@\S+\.\S+/.test(rawValue)),
    };
  },

  phone(options: RouteParamFactoryOptions = {}): RouteParamSpec {
    const hints = mergeFactoryValues(
      DEFAULT_PHONE_HINTS,
      options.hints,
      options.includeDefaultHints !== false
    );

    return {
      name: options.name ?? "phone",
      kind: "phone",
      required: options.required,
      queryKey: options.queryKey ?? "phone",
      pathKey: options.pathKey,
      hints,
      pattern:
        options.pattern ??
        /(\+?\d[\d\s().-]{7,}\d)/gi,
      parse:
        options.parse ??
        ((rawValue) => rawValue.replace(/\D+/g, "")),
      validate:
        options.validate ??
        ((rawValue) => rawValue.replace(/\D+/g, "").length >= 10),
    };
  },
};

export function createPatternRouteParam(
  spec: RouteParamSpec
): RouteParamSpec {
  return spec;
}

export function createCustomRouteParam(
  spec: RouteParamSpec
): RouteParamSpec {
  return spec;
}
