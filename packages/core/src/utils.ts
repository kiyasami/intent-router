import { embedGroups } from "./embed";
import { CommandDef, EmbedOptions } from "./types";

export function embedCommand<TData>(
  command: CommandDef<TData>,
  dimension: number,
  options: EmbedOptions = {}
): Float32Array {
  return embedGroups(
    [
      { prefix: "title", text: command.title, weight: 3.0 },
      { prefix: "syn", text: (command.synonyms ?? []).join(" "), weight: 1.5 },
      { prefix: "key", text: (command.keywords ?? []).join(" "), weight: 1.0 },
    ],
    dimension,
    options
  );
}


