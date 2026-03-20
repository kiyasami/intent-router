import { embedGroups } from "./embed.js";
export function embedCommand(command, dimension, options = {}) {
    return embedGroups([
        { prefix: "title", text: command.title, weight: 3.0 },
        { prefix: "syn", text: (command.synonyms ?? []).join(" "), weight: 1.5 },
        { prefix: "key", text: (command.keywords ?? []).join(" "), weight: 1.0 },
    ], dimension, options);
}
