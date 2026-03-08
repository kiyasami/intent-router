import { DEFAULT_DIM, dot, embed } from "./embed";
import { computeProfileBoost } from "./score";
import { CommandDef, IntentRouterOptions, RankedCommand, UserProfile } from "./types";

type IndexedCommand = {
  command: CommandDef;
  vec: Float32Array;
};

function buildCommandText(command: CommandDef): string {
  return [command.title, ...(command.synonyms ?? []), ...(command.keywords ?? [])]
    .filter(Boolean)
    .join(" ");
}

export class IntentRouter {
  private dimension: number;
  private indexed: IndexedCommand[];

  constructor(options: IntentRouterOptions) {
    this.dimension = options.dimension ?? DEFAULT_DIM;
    this.indexed = options.commands.map((command) => ({
      command,
      vec: embed(buildCommandText(command), this.dimension),
    }));
  }

  rank(args: { query: string; profile?: UserProfile; limit?: number }): RankedCommand[] {
    const { query, profile, limit = 10 } = args;
    const queryVector = embed(query, this.dimension);

    const results = this.indexed.map((item) => {
      const baseScore = dot(queryVector, item.vec);
      const profileBoost = computeProfileBoost({
        queryVector,
        commandId: item.command.id,
        profile,
      });

      return {
        id: item.command.id,
        score: baseScore + profileBoost,
        baseScore,
        profileBoost,
        command: item.command,
      };
    });

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}
