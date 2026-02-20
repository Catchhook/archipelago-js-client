export type IslandProps = Record<string, unknown>;
export type IslandOkResponse = {
    status: "ok";
    props: IslandProps;
    version?: number;
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
export declare function parseIslandResponse(value: unknown): IslandResponse;
