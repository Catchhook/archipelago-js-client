import { describe, expect, it } from "vitest"

import {
  ArchipelagoTransportError,
  FORM_ERROR,
  parseIslandResponse
} from "../src/types"

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

    expect(response.status).toBe("ok")
    if (response.status === "ok") {
      expect(response.props).toEqual({ members: [] })
      expect(typeof response.version).toBe("number")
    }
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

  it("throws ArchipelagoTransportError on invalid payloads", () => {
    try {
      parseIslandResponse("not an object")
    } catch (error) {
      expect(error).toBeInstanceOf(ArchipelagoTransportError)
      expect((error as ArchipelagoTransportError).name).toBe("ArchipelagoTransportError")
      return
    }
    throw new Error("Expected error to be thrown")
  })
})

describe("FORM_ERROR", () => {
  it("equals _base", () => {
    expect(FORM_ERROR).toBe("_base")
  })
})

describe("ArchipelagoTransportError", () => {
  it("captures statusCode and responseBody", () => {
    const error = new ArchipelagoTransportError("test error", {
      statusCode: 500,
      responseBody: "<html>error</html>"
    })

    expect(error.message).toBe("test error")
    expect(error.statusCode).toBe(500)
    expect(error.responseBody).toBe("<html>error</html>")
    expect(error.name).toBe("ArchipelagoTransportError")
    expect(error).toBeInstanceOf(Error)
  })

  it("works without optional fields", () => {
    const error = new ArchipelagoTransportError("basic error")

    expect(error.message).toBe("basic error")
    expect(error.statusCode).toBeUndefined()
    expect(error.responseBody).toBeUndefined()
  })
})
