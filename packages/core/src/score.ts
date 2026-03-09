import { CommandDef, UserProfile, ScoreSignal, ScoreSignalArgs } from "./types";
import { centroidSignal, affinitySignal } from "./signals";

/**
 * Convenience helper that applies a list of signals (defaults to the
 * built‑in centroid+affinity signals) and returns their sum. This mirrors
 * how the router scores results but can be used standalone for testing or
 * utilities.
 */
export function computeProfileBoost(
  args: Omit<ScoreSignalArgs, "commandVec"> & {
    commandVec?: Float32Array;
    signals?: ScoreSignal[];
  }
): number {
  const { signals = [centroidSignal, affinitySignal] } = args;
  return signals.reduce((sum, sig) => sum + sig(args as ScoreSignalArgs), 0);
}
