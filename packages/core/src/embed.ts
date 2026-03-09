import { EmbedOptions } from "./types";

export const DEFAULT_DIM = 1024;

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
  // split on non-alphanumeric, keeping only real words
  const matches = normalized.match(/\b\w+\b/g);
  return matches ? matches : [];
}

export function charNgrams(text: string, n = 3): string[] {
  const s = `__${normalizeText(text)}__`;
  const grams: string[] = [];
  for (let i = 0; i < s.length - n + 1; i++) {
    grams.push(s.slice(i, i + n));
  }
  return grams;
}

export function l2Normalize(vec: Float32Array): Float32Array {
  let sumSq = 0;
  for (let i = 0; i < vec.length; i++) sumSq += vec[i] * vec[i];
  const norm = Math.sqrt(sumSq) || 1;
  for (let i = 0; i < vec.length; i++) vec[i] /= norm;
  return vec;
}

export function embed(
  text: string,
  dim = DEFAULT_DIM,
  opts: EmbedOptions = {}
): Float32Array {
  const {
    dimension = dim,
    wordWeight = 3,
    charWeight = 1,
    charN = 3,
  } = opts;

  const vec = new Float32Array(dimension);
  const words = tokenizeWords(text);
  for (const w of words) {
    const idx = fnv1a32(`w:${w}`) % dimension;
    vec[idx] += wordWeight;
  }
  const grams = charNgrams(text, charN);
  for (const g of grams) {
    const idx = fnv1a32(`c:${g}`) % dimension;
    vec[idx] += charWeight;
  }

  return l2Normalize(vec);
}

export function dot(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}
