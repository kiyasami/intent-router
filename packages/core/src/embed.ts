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

export function charTrigrams(text: string): string[] {
  const s = `__${normalizeText(text)}__`;
  const grams: string[] = [];
  for (let i = 0; i < s.length - 2; i++) {
    grams.push(s.slice(i, i + 3));
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

export function embed(text: string, dim = DEFAULT_DIM): Float32Array {
  const vec = new Float32Array(dim);
  for (const gram of charTrigrams(text)) {
    const idx = fnv1a32(gram) % dim;
    vec[idx] += 1;
  }
  return l2Normalize(vec);
}

export function dot(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}
