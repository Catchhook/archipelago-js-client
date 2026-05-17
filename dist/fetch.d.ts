import { IslandResponse } from "./types";
export type UploadProgress = {
    percentage: number;
    loaded: number;
    total: number | undefined;
};
export type IslandFetchOptions = {
    endpoint?: string;
    fixedParams?: Record<string, unknown>;
    overridePayload?: Record<string, unknown>;
    headers?: Record<string, string>;
    signal?: AbortSignal;
    fetchImpl?: typeof fetch;
    navigate?: (location: string) => void;
    stream?: string;
    onUploadProgress?: (progress: UploadProgress) => void;
};
export type IslandFetchPayload = Record<string, unknown>;
export declare function buildIslandPayload(payload?: IslandFetchPayload, fixedParams?: Record<string, unknown>, overridePayload?: Record<string, unknown>): Record<string, unknown>;
export declare function islandFetch(component: string, operation: string, payload?: IslandFetchPayload, options?: IslandFetchOptions): Promise<IslandResponse>;
