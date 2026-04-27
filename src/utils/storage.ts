// Typed localStorage and sessionStorage helpers
// Handles JSON parse errors gracefully (returns null, logs warning)

export function getItem<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return null
    return JSON.parse(raw) as T
  } catch (err) {
    console.warn(`[storage] Failed to parse localStorage key "${key}":`, err)
    return null
  }
}

export function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    console.warn(`[storage] Failed to write localStorage key "${key}":`, err)
  }
}

export function removeItem(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch (err) {
    console.warn(`[storage] Failed to remove localStorage key "${key}":`, err)
  }
}

// Strips whitespace and invisible/non-printable characters that mobile paste can introduce.
export function sanitiseApiKey(raw: string): string {
  return raw.replace(/[^\x20-\x7E]/g, '').trim()
}

// sessionStorage variants — used for API key (never persisted across tab close)

export function sessionStorageGet<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key)
    if (raw === null) return null
    // For plain strings (like the API key) stored without JSON.stringify wrapping
    try {
      return JSON.parse(raw) as T
    } catch {
      // If it's a plain string value, return as-is
      return raw as unknown as T
    }
  } catch (err) {
    console.warn(`[storage] Failed to read sessionStorage key "${key}":`, err)
    return null
  }
}

export function sessionStorageSet<T>(key: string, value: T): void {
  try {
    const serialised = typeof value === 'string' ? value : JSON.stringify(value)
    sessionStorage.setItem(key, serialised)
  } catch (err) {
    console.warn(`[storage] Failed to write sessionStorage key "${key}":`, err)
  }
}

export function sessionStorageRemove(key: string): void {
  try {
    sessionStorage.removeItem(key)
  } catch (err) {
    console.warn(`[storage] Failed to remove sessionStorage key "${key}":`, err)
  }
}
