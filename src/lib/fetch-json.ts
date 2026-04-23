export async function fetchJson<T = unknown>(
  url: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  let res: Response
  try {
    res = await fetch(url, init)
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: err instanceof Error ? err.message : 'Network error',
    }
  }

  const text = await res.text()
  if (!text) {
    return {
      ok: res.ok,
      status: res.status,
      data: null,
      error: res.ok ? undefined : `Empty response (HTTP ${res.status})`,
    }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return {
      ok: false,
      status: res.status,
      data: null,
      error: `Invalid JSON from server (HTTP ${res.status})`,
    }
  }

  if (!res.ok) {
    const msg =
      (parsed && typeof parsed === 'object' && 'error' in parsed
        ? String((parsed as { error?: unknown }).error)
        : undefined) ?? `Request failed (HTTP ${res.status})`
    return { ok: false, status: res.status, data: parsed as T, error: msg }
  }
  return { ok: true, status: res.status, data: parsed as T }
}
