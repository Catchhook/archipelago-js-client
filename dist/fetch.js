import { clearCsrfCache, getCsrfToken } from "./csrf";
import { ArchipelagoTransportError, parseIslandResponse } from "./types";
function defaultNavigate(location) {
    const turbo = window.Turbo;
    if (turbo?.visit) {
        turbo.visit(location);
        return;
    }
    window.location.assign(location);
}
function hasContent(response) {
    const contentLength = response.headers.get("content-length");
    return contentLength == null || contentLength !== "0";
}
function looksLikeHtml(text) {
    const trimmed = text.trimStart();
    return trimmed.startsWith("<!") || trimmed.startsWith("<html") || trimmed.startsWith("<HTML");
}
export function buildIslandPayload(payload = {}, fixedParams = {}, overridePayload = {}) {
    return {
        ...fixedParams,
        ...payload,
        ...overridePayload
    };
}
export async function islandFetch(component, operation, payload = {}, options = {}) {
    const fetchImpl = options.fetchImpl ?? fetch;
    const endpoint = options.endpoint ?? "/islands";
    const mergedPayload = buildIslandPayload(payload, options.fixedParams, options.overridePayload);
    const csrfToken = getCsrfToken();
    const requestHeaders = {
        "content-type": "application/json",
        "x-requested-with": "XMLHttpRequest",
        ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
        ...(options.stream ? { "x-archipelago-stream": options.stream } : {}),
        ...(options.headers ?? {})
    };
    let response;
    try {
        response = await fetchImpl(`${endpoint}/${encodeURIComponent(component)}/${encodeURIComponent(operation)}`, {
            method: "POST",
            signal: options.signal,
            credentials: "same-origin",
            headers: requestHeaders,
            body: JSON.stringify(mergedPayload)
        });
    }
    catch (error) {
        throw new ArchipelagoTransportError("Network request failed", { cause: error });
    }
    if (response.status === 422) {
        clearCsrfCache();
    }
    if (response.status === 403 && !hasContent(response)) {
        return { status: "forbidden" };
    }
    if (!hasContent(response)) {
        return { status: "ok", props: {}, version: Date.now() };
    }
    let text;
    try {
        text = await response.text();
    }
    catch (error) {
        throw new ArchipelagoTransportError("Failed to read response body", {
            statusCode: response.status,
            cause: error
        });
    }
    if (text.trim().length === 0) {
        return { status: "ok", props: {}, version: Date.now() };
    }
    if (looksLikeHtml(text)) {
        throw new ArchipelagoTransportError("Received HTML instead of JSON", {
            statusCode: response.status,
            responseBody: text.slice(0, 500)
        });
    }
    let parsed;
    try {
        parsed = JSON.parse(text);
    }
    catch (error) {
        throw new ArchipelagoTransportError("Failed to parse JSON response", {
            statusCode: response.status,
            responseBody: text.slice(0, 500),
            cause: error
        });
    }
    const result = parseIslandResponse(parsed);
    if (result.status === "redirect") {
        const navigate = options.navigate ?? defaultNavigate;
        navigate(result.location);
    }
    return result;
}
//# sourceMappingURL=fetch.js.map