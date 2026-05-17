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
function xhrFetch(url, headers, body, signal, onUploadProgress) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", url, true);
        xhr.withCredentials = true;
        for (const [key, value] of Object.entries(headers)) {
            xhr.setRequestHeader(key, value);
        }
        xhr.upload.addEventListener("progress", (event) => {
            onUploadProgress({
                percentage: event.lengthComputable ? Math.round((event.loaded / event.total) * 100) : 0,
                loaded: event.loaded,
                total: event.lengthComputable ? event.total : undefined
            });
        });
        xhr.addEventListener("load", () => {
            resolve({
                status: xhr.status,
                text: xhr.responseText,
                getHeader: (name) => xhr.getResponseHeader(name)
            });
        });
        xhr.addEventListener("error", () => {
            reject(new ArchipelagoTransportError("Network request failed"));
        });
        xhr.addEventListener("abort", () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
        });
        if (signal) {
            if (signal.aborted) {
                xhr.abort();
                return;
            }
            signal.addEventListener("abort", () => xhr.abort(), { once: true });
        }
        xhr.send(body);
    });
}
function parseResponseText(text, statusCode, navigate) {
    if (text.trim().length === 0) {
        return { status: "ok", props: {}, version: Date.now() };
    }
    if (looksLikeHtml(text)) {
        throw new ArchipelagoTransportError("Received HTML instead of JSON", {
            statusCode,
            responseBody: text.slice(0, 500)
        });
    }
    let parsed;
    try {
        parsed = JSON.parse(text);
    }
    catch (error) {
        throw new ArchipelagoTransportError("Failed to parse JSON response", {
            statusCode,
            responseBody: text.slice(0, 500),
            cause: error
        });
    }
    const result = parseIslandResponse(parsed);
    if (result.status === "redirect") {
        navigate(result.location);
    }
    return result;
}
export async function islandFetch(component, operation, payload = {}, options = {}) {
    const endpoint = options.endpoint ?? "/islands";
    const mergedPayload = buildIslandPayload(payload, options.fixedParams, options.overridePayload);
    const csrfToken = getCsrfToken();
    const navigate = options.navigate ?? defaultNavigate;
    const requestHeaders = {
        "content-type": "application/json",
        "x-requested-with": "XMLHttpRequest",
        ...(csrfToken ? { "x-csrf-token": csrfToken } : {}),
        ...(options.stream ? { "x-archipelago-stream": options.stream } : {}),
        ...(options.headers ?? {})
    };
    const url = `${endpoint}/${encodeURIComponent(component)}/${encodeURIComponent(operation)}`;
    const body = JSON.stringify(mergedPayload);
    if (options.onUploadProgress) {
        const xhrResult = await xhrFetch(url, requestHeaders, body, options.signal, options.onUploadProgress);
        if (xhrResult.status === 422) {
            clearCsrfCache();
        }
        const contentLength = xhrResult.getHeader("content-length");
        const hasBody = contentLength == null || contentLength !== "0";
        if (xhrResult.status === 403 && !hasBody) {
            return { status: "forbidden" };
        }
        if (!hasBody) {
            return { status: "ok", props: {}, version: Date.now() };
        }
        return parseResponseText(xhrResult.text, xhrResult.status, navigate);
    }
    const fetchImpl = options.fetchImpl ?? fetch;
    let response;
    try {
        response = await fetchImpl(url, {
            method: "POST",
            signal: options.signal,
            credentials: "same-origin",
            headers: requestHeaders,
            body
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
    return parseResponseText(text, response.status, navigate);
}
//# sourceMappingURL=fetch.js.map