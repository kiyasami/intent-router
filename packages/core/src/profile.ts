export function confidence(count: number): number {
  return Math.min(1, Math.log(count + 1) / 4);
}

export function updateCentroid(
  oldCentroid: Float32Array | null,
  oldCount: number,
  newVec: Float32Array
): { centroid: Float32Array; count: number } {
  const count = oldCount + 1;
  const centroid = oldCentroid
    ? Float32Array.from(oldCentroid)
    : new Float32Array(newVec.length);

  for (let i = 0; i < centroid.length; i++) {
    centroid[i] = centroid[i] + (newVec[i] - centroid[i]) / count;
  }

  let sumSq = 0;
  for (let i = 0; i < centroid.length; i++) sumSq += centroid[i] * centroid[i];
  const norm = Math.sqrt(sumSq) || 1;
  for (let i = 0; i < centroid.length; i++) centroid[i] /= norm;

  return { centroid, count };
}
