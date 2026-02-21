import { describe, expect, it } from "vitest"

import { parseIslandResponse } from "../src/types"

describe("parseIslandResponse", () => {
  it("parses ok payload", () => {
    const response = parseIslandResponse({
      status: "ok",
      props: { members: [] },
      version: 100
    })

    expect(response.status).toBe("ok")
    if (response.status === "ok") {
      expect(response.props).toEqual({ members: [] })
      expect(response.version).toBe(100)
    }
  })

  it("parses redirect payload", () => {
    expect(parseIslandResponse({ status: "redirect", location: "/teams/1" })).toEqual({
      status: "redirect",
      location: "/teams/1"
    })
  })

  it("parses error payload", () => {
    expect(
      parseIslandResponse({
        status: "error",
        errors: { email: ["can't be blank"] }
      })
    ).toEqual({
      status: "error",
      errors: { email: ["can't be blank"] }
    })
  })

  it("accepts ok payload without version", () => {
    const response = parseIslandResponse({
      status: "ok",
      props: { members: [] }
    })

    expect(response).toEqual({
      status: "ok",
      props: { members: [] },
      version: undefined
    })
  })

  it("throws for invalid payload", () => {
    expect(() => parseIslandResponse({ status: "ok", props: [] })).toThrow(
      /Invalid ok payload/
    )
  })

  it("throws for invalid redirect payload", () => {
    expect(() => parseIslandResponse({ status: "redirect", location: 123 })).toThrow(
      /Invalid redirect payload/
    )
  })

  it("throws for invalid error payload shape", () => {
    expect(() =>
      parseIslandResponse({
        status: "error",
        errors: { email: "not-an-array" }
      })
    ).toThrow(/Invalid error payload/)
  })

  it("throws for unknown status", () => {
    expect(() =>
      parseIslandResponse({
        status: "mystery",
        props: {}
      })
    ).toThrow(/Unknown island response status/)
  })
})
