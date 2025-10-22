import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { apiClient, createTestApiKey, cleanupTestData } from '../setup/test-helpers'
import testData from '../fixtures/test-data.json'

describe('API Keys Endpoints', () => {
  let testApiKey: any
  let apiKeyToken: string

  beforeAll(async () => {
    testApiKey = await createTestApiKey()
    apiKeyToken = testApiKey.key
  })

  afterAll(async () => {
    if (testApiKey) {
      await cleanupTestData(testApiKey.id, apiKeyToken)
    }
  })

  describe('POST /api/keys/generate', () => {
    it('should generate a new API key', async () => {
      const response = await apiClient.post('/api/keys/generate', testData.validApiKey)
      
      expect(response.status).toBe(201)
      expect(response.data.success).toBe(true)
      expect(response.data.data.key).toMatch(/^sk-/)
      expect(response.data.data.name).toBe(testData.validApiKey.name)
      
      // Cleanup the extra key
      await cleanupTestData(response.data.data.id, response.data.data.key)
    })

    it('should reject invalid input', async () => {
      const response = await apiClient.post('/api/keys/generate', { name: '' })
      
      expect(response.status).toBe(422) // Fixed: 422 instead of 400
      expect(response.data.success).toBe(false)
    })

    it('should reject missing name field', async () => {
      const response = await apiClient.post('/api/keys/generate', {})
      
      expect(response.status).toBe(422)
      expect(response.data.success).toBe(false)
    })
  })

  describe('GET /api/keys/', () => {
    it('should list API keys', async () => {
      const response = await apiClient.get('/api/keys/')
      
      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      expect(Array.isArray(response.data.data)).toBe(true)
    })
  })

  describe('DELETE /api/keys/:id', () => {
    it('should delete an API key', async () => {
      const newKey = await createTestApiKey()
      
      const response = await apiClient.delete(`/api/keys/${newKey.id}`)
      
      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
    })

    it('should return 404 for non-existent key', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'
      const response = await apiClient.delete(`/api/keys/${fakeId}`)
      
      expect(response.status).toBe(404)
    })
  })
})