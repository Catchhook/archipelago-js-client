import { beforeEach, describe, expect, it } from "vitest"

import { clearCsrfCache, getCsrfToken, refreshCsrfToken } from "../src/csrf"

describe("csrf", () => {
  beforeEach(() => {
    clearCsrfCache()
    document.head.innerHTML = ""
  })

  it("reads the token from meta tag", () => {
    document.head.innerHTML = '<meta name="csrf-token" content="abc123">'

    expect(getCsrfToken()).toBe("abc123")
  })

  it("caches token reads", () => {
    document.head.innerHTML = '<meta name="csrf-token" content="abc123">'
    expect(getCsrfToken()).toBe("abc123")

    document.head.innerHTML = '<meta name="csrf-token" content="new-token">'
    expect(getCsrfToken()).toBe("abc123")
    expect(refreshCsrfToken()).toBe("new-token")
  })

  it("returns null when token is missing", () => {
    expect(getCsrfToken()).toBeNull()
  })
})
