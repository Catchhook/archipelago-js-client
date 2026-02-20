function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isErrorMap(value) {
    if (!isRecord(value)) {
        return false;
    }
    return Object.values(value).every((messages) => {
        return Array.isArray(messages) && messages.every((message) => typeof message === "string");
    });
}
export function parseIslandResponse(value) {
    if (!isRecord(value) || typeof value.status !== "string") {
        throw new Error("Invalid island response payload");
    }
    switch (value.status) {
        case "ok": {
            if (!isRecord(value.props)) {
                throw new Error("Invalid ok payload");
            }
            if (value.version != null && typeof value.version !== "number") {
                throw new Error("Invalid ok version");
            }
            return {
                status: "ok",
                props: value.props,
                version: typeof value.version === "number" ? value.version : undefined
            };
        }
        case "redirect": {
            if (typeof value.location !== "string") {
                throw new Error("Invalid redirect payload");
            }
            return { status: "redirect", location: value.location };
        }
        case "error": {
            if (!isErrorMap(value.errors)) {
                throw new Error("Invalid error payload");
            }
            return { status: "error", errors: value.errors };
        }
        case "forbidden":
            return { status: "forbidden" };
        default:
            throw new Error("Unknown island response status");
    }
}
//# sourceMappingURL=types.js.map