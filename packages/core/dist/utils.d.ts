import { CommandDef, EmbedOptions } from "./types.js";
export declare function embedCommand<TData>(command: CommandDef<TData>, dimension: number, options?: EmbedOptions): Float32Array;
