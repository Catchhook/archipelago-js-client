let cachedToken: string | null = null

export function getCsrfToken(doc: Document = document): string | null {
  if (cachedToken !== null) {
    return cachedToken
  }

  const token = doc
    .querySelector("meta[name='csrf-token']")
    ?.getAttribute("content")
    ?.trim()

  cachedToken = token && token.length > 0 ? token : null
  return cachedToken
}

export function refreshCsrfToken(doc: Document = document): string | null {
  cachedToken = null
  return getCsrfToken(doc)
}

export function clearCsrfCache(): void {
  cachedToken = null
}
