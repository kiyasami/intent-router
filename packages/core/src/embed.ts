import { EmbedGroup, EmbedOptions } from "./types";

export const DEFAULT_DIM = 1024;
export const DEFAULT_WORD_WEIGHT = 3;
export const DEFAULT_CHAR_WEIGHT = 1;
export const DEFAULT_CHAR_N = 3;

export function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, " ");
}

export function fnv1a32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function tokenizeWords(text: string): string[] {
  const normalized = normalizeText(text);
  const matches = normalized.match(/\b\w+\b/g);
  return matches ?? [];
}

function createStopWordSet(stopWords?: readonly string[]): Set<string> | undefined {
  if (!stopWords || stopWords.length === 0) return undefined;

  const normalizedStopWords = stopWords
    .flatMap((word) => tokenizeWords(word))
    .filter(Boolean);

  return normalizedStopWords.length > 0
    ? new Set(normalizedStopWords)
    : undefined;
}

function removeStopWords(text: string, stopWords?: Set<string>): string {
  const normalized = normalizeText(text);
  if (!normalized || !stopWords || stopWords.size === 0) {
    return normalized;
  }

  return tokenizeWords(normalized)
    .filter((token) => !stopWords.has(token))
    .join(" ");
}

export function charNgrams(text: string, n = DEFAULT_CHAR_N): string[] {
  const normalized = normalizeText(text);
  if (!normalized || n <= 0) return [];

  const pad = "_".repeat(Math.max(1, n - 1));
  const s = `${pad}${normalized}${pad}`;
  const grams: string[] = [];

  for (let i = 0; i <= s.length - n; i++) {
    grams.push(s.slice(i, i + n));
  }

  return grams;
}

export function l2Normalize(vec: Float32Array): Float32Array {
  let sumSq = 0;
  for (let i = 0; i < vec.length; i++) {
    sumSq += vec[i] * vec[i];
  }

  if (sumSq === 0) return vec;

  const norm = Math.sqrt(sumSq);
  for (let i = 0; i < vec.length; i++) {
    vec[i] /= norm;
  }

  return vec;
}

function accumulateWeightedFeatures(
  vec: Float32Array,
  features: Iterable<string>,
  weight: number,
  prefix: string
): void {
  if (weight === 0) return;

  const counts = new Map<string, number>();
  for (const feature of features) {
    counts.set(feature, (counts.get(feature) ?? 0) + 1);
  }

  for (const [feature, count] of counts) {
    const idx = fnv1a32(`${prefix}:${feature}`) % vec.length;
    vec[idx] += weight * (1 + Math.log(count));
  }
}

export function embedGroups(
  groups: readonly EmbedGroup[],
  dim = DEFAULT_DIM,
  opts: EmbedOptions = {}
): Float32Array {
  const {
    dimension = dim,
    wordWeight = DEFAULT_WORD_WEIGHT,
    charWeight = DEFAULT_CHAR_WEIGHT,
    charN = DEFAULT_CHAR_N,
    stopWords,
  } = opts;

  const vec = new Float32Array(dimension);
  const stopWordSet = createStopWordSet(stopWords);

  for (const group of groups) {
    const normalized = removeStopWords(group.text, stopWordSet);
    if (!normalized || group.weight === 0) continue;

    // All searchable text shares the same hash namespace so query terms
    // and command terms can align directly in the dot product.
    accumulateWeightedFeatures(
      vec,
      tokenizeWords(normalized),
      wordWeight * group.weight,
      "w"
    );

    accumulateWeightedFeatures(
      vec,
      charNgrams(normalized, charN),
      charWeight * group.weight,
      "c"
    );
  }

  return l2Normalize(vec);
}

export function embed(
  text: string,
  dim = DEFAULT_DIM,
  opts: EmbedOptions = {}
): Float32Array {
  return embedGroups(
    [{ prefix: "text", text, weight: 1 }],
    dim,
    opts
  );
}

export function dot(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error("Vector dimension mismatch");
  }

  let s = 0;
  for (let i = 0; i < a.length; i++) {
    s += a[i] * b[i];
  }
  return s;
}
