import { CommandDef, ResolvedRouteParam, RouteCommandDef, RouteCommandData, RouteParamSpec, RouteResolution, RouteTarget } from "./types.js";
declare type RouteParamFactoryOptions = Partial<Omit<RouteParamSpec, "kind" | "match">>;
export declare function isRouteCommandData(value: unknown): value is RouteCommandData;
export declare function resolveRouteParams(query: string, specs?: readonly RouteParamSpec[]): ResolvedRouteParam[];
export declare function computeRouteParamBoost<TData = unknown>(command: CommandDef<TData>, query: string): number;
export declare function resolveCommandRoute<TData = unknown>(command: CommandDef<TData>, query: string): RouteResolution | undefined;
export declare function createRouteCommandData(route: RouteTarget, params?: readonly RouteParamSpec[], routeLabel?: string): RouteCommandData;
export declare function defineRouteCommand<TData extends RouteCommandData = RouteCommandData>(command: RouteCommandDef<TData>): RouteCommandDef<TData>;
export declare const routeParamMatchers: {
    poNumber(options?: RouteParamFactoryOptions): RouteParamSpec;
    sku(options?: RouteParamFactoryOptions): RouteParamSpec;
    invoiceNumber(options?: RouteParamFactoryOptions): RouteParamSpec;
    email(options?: RouteParamFactoryOptions): RouteParamSpec;
    phone(options?: RouteParamFactoryOptions): RouteParamSpec;
};
export declare function createPatternRouteParam(spec: RouteParamSpec): RouteParamSpec;
export declare function createCustomRouteParam(spec: RouteParamSpec): RouteParamSpec;
export {};
