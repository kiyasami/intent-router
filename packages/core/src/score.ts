import { ProfileMetadata, ScoreSignal, ScoreSignalArgs } from "./types";
import { centroidSignal, affinitySignal } from "./signals";

/**
 * Convenience helper that applies a list of signals (defaults to the
 * built‑in centroid+affinity signals) and returns their sum. This mirrors
 * how the router scores results but can be used standalone for testing or
 * utilities.
 */
export function computeProfileBoost<
  TData = unknown,
  TMeta extends ProfileMetadata = ProfileMetadata
>(
  args: ScoreSignalArgs<TData, TMeta> & {
  signals?: readonly ScoreSignal<TData, TMeta>[];
  }
): number {
  const { signals = [centroidSignal, affinitySignal] } = args;

  let total = 0;

  for (const signal of signals) {
    const result = signal(args);
    total += typeof result === "number" ? result : result.score;
  }

  return total;
}
