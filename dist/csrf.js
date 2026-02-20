let cachedToken = null;
export function getCsrfToken(doc = document) {
    if (cachedToken !== null) {
        return cachedToken;
    }
    const token = doc
        .querySelector("meta[name='csrf-token']")
        ?.getAttribute("content")
        ?.trim();
    cachedToken = token && token.length > 0 ? token : null;
    return cachedToken;
}
export function refreshCsrfToken(doc = document) {
    cachedToken = null;
    return getCsrfToken(doc);
}
export function clearCsrfCache() {
    cachedToken = null;
}
//# sourceMappingURL=csrf.js.map