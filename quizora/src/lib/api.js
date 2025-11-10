import { auth } from './firebase'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) {
    const msg = (data && (data.message || data.error)) || res.statusText
    throw new Error(msg || 'Request failed')
  }
  return data
}

export const API = {
  createQuiz: (quiz) => request('/quizzes/create', { method: 'POST', body: quiz }),
  getQuizByCode: (code) => request(`/quizzes/code/${encodeURIComponent(code)}`),
  joinQuiz: (quizCode, name) => request('/quizzes/join', { method: 'POST', body: { quizCode, name } }),
  submit: async (quizCode, name, durationSeconds, answers) => {
    const token = auth.currentUser ? await auth.currentUser.getIdToken() : null
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return request('/quizzes/submit', {
      method: 'POST',
      headers,
      body: { quizCode, name, durationSeconds, answers },
    })
  },
  participants: (code) => request(`/quizzes/${encodeURIComponent(code)}/participants`),
  results: (code) => request(`/quizzes/${encodeURIComponent(code)}/results`),
}
