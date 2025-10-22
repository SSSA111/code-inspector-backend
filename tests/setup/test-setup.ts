const API_BASE_URL = process.env.TEST_API_URL || 'http://localhost:8787'

export class ApiClient {
  private baseUrl: string
  private defaultHeaders: Record<string, string>

  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    }
  }

  setAuthToken(token: string) {
    this.defaultHeaders['Authorization'] = `Bearer ${token}`
  }

  async get(endpoint: string, headers = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: { ...this.defaultHeaders, ...headers },
    })
    return this.handleResponse(response)
  }

  async post(endpoint: string, body?: any, headers = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { ...this.defaultHeaders, ...headers },
      body: body ? JSON.stringify(body) : undefined,
    })
    return this.handleResponse(response)
  }

  async put(endpoint: string, body?: any, headers = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: { ...this.defaultHeaders, ...headers },
      body: body ? JSON.stringify(body) : undefined,
    })
    return this.handleResponse(response)
  }

  async delete(endpoint: string, headers = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: { ...this.defaultHeaders, ...headers },
    })
    return this.handleResponse(response)
  }

  private async handleResponse(response: Response) {
    const data = await response.json().catch(() => null)
    return {
      status: response.status,
      data,
      headers: response.headers,
    }
  }
}

export const apiClient = new ApiClient()

// Helper to generate test API key
export async function createTestApiKey() {
  const response = await apiClient.post('/api/keys/generate', {
    name: `Test Key ${Date.now()}`
  })
  
  if (response.status !== 201) {
    throw new Error('Failed to create test API key')
  }
  
  return response.data.data
}

// Helper to cleanup test data
export async function cleanupTestData(apiKeyId: string, token: string) {
  apiClient.setAuthToken(token)
  await apiClient.delete(`/api/keys/${apiKeyId}`)
}