import { CommandDef, IntentRouterOptions, RankedCommand, UserProfile, CommandId, ProfileMetadata } from "./types.js";
import { ProfileManager } from "./profile.js";
export declare type RankOptions<TMeta extends ProfileMetadata = ProfileMetadata> = {
    query: string;
    profile?: UserProfile<TMeta>;
    limit?: number;
};
export declare class IntentRouter<TData = unknown, TMeta extends ProfileMetadata = ProfileMetadata> {
    private readonly dimension;
    private readonly embedOptions;
    private readonly signals;
    private readonly postRankStages;
    private indexed;
    private commandIds;
    constructor(options: IntentRouterOptions<TData, TMeta>);
    rank(args: RankOptions<TMeta>): RankedCommand<TData>[];
    personalize(args: {
        userId: string;
        query: string;
        commandId: CommandId;
        affinityDelta?: number;
    }, profileManager: ProfileManager<TMeta>): void;
    getDimension(): number;
    setCommands(commands: readonly CommandDef<TData>[]): void;
    addCommands(commands: readonly CommandDef<TData>[]): void;
}
