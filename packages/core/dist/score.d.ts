import { ProfileMetadata, ScoreSignal, ScoreSignalArgs } from "./types.js";
/**
 * Convenience helper that applies a list of signals (defaults to the
 * built‑in centroid+affinity signals) and returns their sum. This mirrors
 * how the router scores results but can be used standalone for testing or
 * utilities.
 */
export declare function computeProfileBoost<TData = unknown, TMeta extends ProfileMetadata = ProfileMetadata>(args: ScoreSignalArgs<TData, TMeta> & {
    signals?: readonly ScoreSignal<TData, TMeta>[];
}): number;
