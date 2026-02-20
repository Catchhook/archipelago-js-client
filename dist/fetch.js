import { clearCsrfCache, getCsrfToken } from "./csrf";
import { parseIslandResponse } from "./types";
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
    const response = await fetchImpl(`${endpoint}/${encodeURIComponent(component)}/${encodeURIComponent(operation)}`, {
        method: "POST",
        signal: options.signal,
        credentials: "same-origin",
        headers: {
            "content-type": "application/json",
            "x-requested-with": "XMLHttpRequest",
            ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
            ...(options.headers ?? {})
        },
        body: JSON.stringify(mergedPayload)
    });
    if (response.status === 422) {
        // Rails may rotate CSRF token; force re-read on next request.
        clearCsrfCache();
    }
    if (response.status === 403 && !hasContent(response)) {
        return { status: "forbidden" };
    }
    if (!hasContent(response)) {
        return { status: "ok", props: {}, version: Date.now() };
    }
    const text = await response.text();
    if (text.trim().length === 0) {
        return { status: "ok", props: {}, version: Date.now() };
    }
    const parsed = parseIslandResponse(JSON.parse(text));
    if (parsed.status === "redirect") {
        const navigate = options.navigate ?? defaultNavigate;
        navigate(parsed.location);
    }
    return parsed;
}
//# sourceMappingURL=fetch.js.map