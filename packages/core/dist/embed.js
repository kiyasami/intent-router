export const DEFAULT_DIM = 1024;
export const DEFAULT_WORD_WEIGHT = 3;
export const DEFAULT_CHAR_WEIGHT = 1;
export const DEFAULT_CHAR_N = 3;
export function normalizeText(text) {
    return text.toLowerCase().trim().replace(/\s+/g, " ");
}
export function fnv1a32(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}
export function tokenizeWords(text) {
    const normalized = normalizeText(text);
    const matches = normalized.match(/\b\w+\b/g);
    return matches ?? [];
}
function createStopWordSet(stopWords) {
    if (!stopWords || stopWords.length === 0)
        return undefined;
    const normalizedStopWords = stopWords
        .flatMap((word) => tokenizeWords(word))
        .filter(Boolean);
    return normalizedStopWords.length > 0
        ? new Set(normalizedStopWords)
        : undefined;
}
function removeStopWords(text, stopWords) {
    const normalized = normalizeText(text);
    if (!normalized || !stopWords || stopWords.size === 0) {
        return normalized;
    }
    return tokenizeWords(normalized)
        .filter((token) => !stopWords.has(token))
        .join(" ");
}
export function charNgrams(text, n = DEFAULT_CHAR_N) {
    const normalized = normalizeText(text);
    if (!normalized || n <= 0)
        return [];
    const pad = "_".repeat(Math.max(1, n - 1));
    const s = `${pad}${normalized}${pad}`;
    const grams = [];
    for (let i = 0; i <= s.length - n; i++) {
        grams.push(s.slice(i, i + n));
    }
    return grams;
}
export function l2Normalize(vec) {
    let sumSq = 0;
    for (let i = 0; i < vec.length; i++) {
        sumSq += vec[i] * vec[i];
    }
    if (sumSq === 0)
        return vec;
    const norm = Math.sqrt(sumSq);
    for (let i = 0; i < vec.length; i++) {
        vec[i] /= norm;
    }
    return vec;
}
function accumulateWeightedFeatures(vec, features, weight, prefix) {
    if (weight === 0)
        return;
    const counts = new Map();
    for (const feature of features) {
        counts.set(feature, (counts.get(feature) ?? 0) + 1);
    }
    for (const [feature, count] of counts) {
        const idx = fnv1a32(`${prefix}:${feature}`) % vec.length;
        vec[idx] += weight * (1 + Math.log(count));
    }
}
export function embedGroups(groups, dim = DEFAULT_DIM, opts = {}) {
    const { dimension = dim, wordWeight = DEFAULT_WORD_WEIGHT, charWeight = DEFAULT_CHAR_WEIGHT, charN = DEFAULT_CHAR_N, stopWords, } = opts;
    const vec = new Float32Array(dimension);
    const stopWordSet = createStopWordSet(stopWords);
    for (const group of groups) {
        const normalized = removeStopWords(group.text, stopWordSet);
        if (!normalized || group.weight === 0)
            continue;
        // All searchable text shares the same hash namespace so query terms
        // and command terms can align directly in the dot product.
        accumulateWeightedFeatures(vec, tokenizeWords(normalized), wordWeight * group.weight, "w");
        accumulateWeightedFeatures(vec, charNgrams(normalized, charN), charWeight * group.weight, "c");
    }
    return l2Normalize(vec);
}
export function embed(text, dim = DEFAULT_DIM, opts = {}) {
    return embedGroups([{ prefix: "text", text, weight: 1 }], dim, opts);
}
export function dot(a, b) {
    if (a.length !== b.length) {
        throw new Error("Vector dimension mismatch");
    }
    let s = 0;
    for (let i = 0; i < a.length; i++) {
        s += a[i] * b[i];
    }
    return s;
}
