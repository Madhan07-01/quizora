import { currentIdToken } from './auth'

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || ''

export async function apiFetch(path, { auth = true, method = 'GET', headers = {}, body } = {}) {
  const init = { method, headers: { 'Content-Type': 'application/json', ...headers } }
  if (body !== undefined) init.body = typeof body === 'string' ? body : JSON.stringify(body)
  if (auth) {
    const token = await currentIdToken().catch(() => null)
    if (token) init.headers['Authorization'] = `Bearer ${token}`
  }
  const res = await fetch(`${API_BASE}${path}`, init)
  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try { const j = await res.json(); msg = j.error || j.message || msg } catch {}
    throw new Error(msg)
  }
  const text = await res.text()
  try { return text ? JSON.parse(text) : null } catch { return text }
}
