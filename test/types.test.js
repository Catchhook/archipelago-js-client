import { describe, expect, it } from "vitest";
import { parseIslandResponse } from "../src/types";
describe("parseIslandResponse", () => {
    it("parses ok payload", () => {
        const response = parseIslandResponse({
            status: "ok",
            props: { members: [] },
            version: 100
        });
        expect(response.status).toBe("ok");
        if (response.status === "ok") {
            expect(response.props).toEqual({ members: [] });
            expect(response.version).toBe(100);
        }
    });
    it("parses redirect payload", () => {
        expect(parseIslandResponse({ status: "redirect", location: "/teams/1" })).toEqual({
            status: "redirect",
            location: "/teams/1"
        });
    });
    it("parses error payload", () => {
        expect(parseIslandResponse({
            status: "error",
            errors: { email: ["can't be blank"] }
        })).toEqual({
            status: "error",
            errors: { email: ["can't be blank"] }
        });
    });
    it("throws for invalid payload", () => {
        expect(() => parseIslandResponse({ status: "ok", props: [] })).toThrow(/Invalid ok payload/);
    });
});
//# sourceMappingURL=types.test.js.map