export type IslandProps = Record<string, unknown>;
export declare const FORM_ERROR: "_base";
export declare class ArchipelagoTransportError extends Error {
    readonly statusCode: number | undefined;
    readonly responseBody: string | undefined;
    constructor(message: string, options?: {
        statusCode?: number;
        responseBody?: string;
        cause?: unknown;
    });
}
export type IslandOkResponse = {
    status: "ok";
    props: IslandProps;
    version: number;
};
export type IslandRedirectResponse = {
    status: "redirect";
    location: string;
};
export type IslandErrorResponse = {
    status: "error";
    errors: Record<string, string[]>;
};
export type IslandForbiddenResponse = {
    status: "forbidden";
};
export type IslandResponse = IslandOkResponse | IslandRedirectResponse | IslandErrorResponse | IslandForbiddenResponse;
export type ArchipelagoResponse = IslandResponse;
export declare function parseIslandResponse(value: unknown): IslandResponse;
