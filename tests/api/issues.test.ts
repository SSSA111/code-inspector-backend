import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { apiClient, createTestApiKey, cleanupTestData } from '../setup/test-helpers'

describe('Issues Endpoints', () => {
  let testApiKey: any
  let projectId: string
  let analysisSessionId: string

  beforeAll(async () => {
    testApiKey = await createTestApiKey()
    apiClient.setAuthToken(testApiKey.key)
    
    // Create a test project
    const projectResponse = await apiClient.post('/api/projects/', {
      name: 'Issues Test Project',
      type: 'github',
      sourceUrl: 'https://github.com/test/issues-repo',
      content: 'const mysql = require("mysql");\n\n// SQL Injection vulnerability\napp.get("/user", (req, res) => {\n  const id = req.query.id;\n  const query = `SELECT * FROM users WHERE id = ${id}`;\n  db.query(query, (err, results) => {\n    res.json(results);\n  });\n});',
      status: 'active'
    })
    
    if (projectResponse.status !== 201) {
      console.error('Failed to create project:', projectResponse.data)
      throw new Error('Failed to create test project')
    }
    
    projectId = projectResponse.data.data.id

    // Start an analysis session to have issues
    const analysisResponse = await apiClient.post('/api/analysis/analyze', {
      projectId
    })
    
    if (analysisResponse.status === 201) {
      analysisSessionId = analysisResponse.data.data.id
    }
  })

  afterAll(async () => {
    if (testApiKey) {
      await cleanupTestData(testApiKey.id, testApiKey.key)
    }
  })

  describe('GET /api/issues/', () => {
    it('should list issues with default pagination', async () => {
      const response = await apiClient.get('/api/issues/')
      
      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      expect(Array.isArray(response.data.data)).toBe(true)
    })

    it('should filter issues by severity', async () => {
      const response = await apiClient.get('/api/issues/?severity=high')
      
      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      expect(Array.isArray(response.data.data)).toBe(true)
    })

    it('should filter issues by resolved status', async () => {
      const response = await apiClient.get('/api/issues/?resolved=false')
      
      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      expect(Array.isArray(response.data.data)).toBe(true)
    })

    it('should filter issues by false positive status', async () => {
      const response = await apiClient.get('/api/issues/?falsePositive=false')
      
      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      expect(Array.isArray(response.data.data)).toBe(true)
    })

    it('should filter issues by project ID', async () => {
      const response = await apiClient.get(`/api/issues/?projectId=${projectId}`)
      
      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      expect(Array.isArray(response.data.data)).toBe(true)
    })

    it('should filter issues by analysis session ID', async () => {
      if (analysisSessionId) {
        const response = await apiClient.get(`/api/issues/?analysisSessionId=${analysisSessionId}`)
        
        expect(response.status).toBe(200)
        expect(response.data.success).toBe(true)
        expect(Array.isArray(response.data.data)).toBe(true)
      }
    })

    it('should support pagination', async () => {
      const response = await apiClient.get('/api/issues/?limit=10&offset=0')
      
      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      expect(Array.isArray(response.data.data)).toBe(true)
    })

    it('should require authentication', async () => {
      apiClient.setAuthToken('invalid-token')
      const response = await apiClient.get('/api/issues/')
      
      expect(response.status).toBe(401)
      expect(response.data.success).toBe(false)
      
      apiClient.setAuthToken(testApiKey.key)
    })

    it('should reject invalid severity values', async () => {
      const response = await apiClient.get('/api/issues/?severity=invalid')
      
      expect(response.status).toBe(422)
      expect(response.data.success).toBe(false)
    })

    it('should reject invalid limit values', async () => {
      const response = await apiClient.get('/api/issues/?limit=0')
      
      expect(response.status).toBe(422)
      expect(response.data.success).toBe(false)
    })

    it('should reject invalid offset values', async () => {
      const response = await apiClient.get('/api/issues/?offset=-1')
      
      expect(response.status).toBe(422)
      expect(response.data.success).toBe(false)
    })
  })

  describe('GET /api/issues/stats', () => {
    it('should get issue statistics', async () => {
      const response = await apiClient.get('/api/issues/stats')
      
      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      expect(response.data.data.totalIssues).toBeDefined()
      expect(typeof response.data.data.totalIssues).toBe('number')
      expect(response.data.data.severityBreakdown).toBeDefined()
      expect(typeof response.data.data.severityBreakdown).toBe('object')
      expect(response.data.data.statusSummary).toBeDefined()
      expect(response.data.data.statusSummary.open).toBeDefined()
      expect(response.data.data.statusSummary.resolved).toBeDefined()
      expect(response.data.data.statusSummary.falsePositive).toBeDefined()
      expect(Array.isArray(response.data.data.topIssueTypes)).toBe(true)
    })

    it('should require authentication', async () => {
      apiClient.setAuthToken('invalid-token')
      const response = await apiClient.get('/api/issues/stats')
      
      expect(response.status).toBe(401)
      expect(response.data.success).toBe(false)
      
      apiClient.setAuthToken(testApiKey.key)
    })

    it('should return consistent data structure', async () => {
      const response = await apiClient.get('/api/issues/stats')
      
      expect(response.status).toBe(200)
      expect(response.data.data).toHaveProperty('totalIssues')
      expect(response.data.data).toHaveProperty('severityBreakdown')
      expect(response.data.data).toHaveProperty('statusSummary')
      expect(response.data.data).toHaveProperty('topIssueTypes')
    })
  })

  describe('GET /api/issues/{id}', () => {
    it('should return 404 for non-existent issue', async () => {
      const fakeIssueId = '00000000-0000-0000-0000-000000000000'
      const response = await apiClient.get(`/api/issues/${fakeIssueId}`)
      
      expect(response.status).toBe(404)
      expect(response.data.success).toBe(false)
    })

    it('should require authentication', async () => {
      const fakeIssueId = '00000000-0000-0000-0000-000000000000'
      apiClient.setAuthToken('invalid-token')
      const response = await apiClient.get(`/api/issues/${fakeIssueId}`)
      
      expect(response.status).toBe(401)
      expect(response.data.success).toBe(false)
      
      apiClient.setAuthToken(testApiKey.key)
    })

    it('should reject invalid UUID format', async () => {
      const response = await apiClient.get('/api/issues/invalid-uuid')
      
      expect(response.status).toBe(422)
      expect(response.data.success).toBe(false)
    })
  })

  describe('PUT /api/issues/{id}/resolve', () => {
    it('should return 404 for non-existent issue', async () => {
      const fakeIssueId = '00000000-0000-0000-0000-000000000000'
      const response = await apiClient.put(`/api/issues/${fakeIssueId}/resolve`)
      
      expect(response.status).toBe(404)
      expect(response.data.success).toBe(false)
    })

    it('should require authentication', async () => {
      const fakeIssueId = '00000000-0000-0000-0000-000000000000'
      apiClient.setAuthToken('invalid-token')
      const response = await apiClient.put(`/api/issues/${fakeIssueId}/resolve`)
      
      expect(response.status).toBe(401)
      expect(response.data.success).toBe(false)
      
      apiClient.setAuthToken(testApiKey.key)
    })

    it('should reject invalid UUID format', async () => {
      const response = await apiClient.put('/api/issues/invalid-uuid/resolve')
      
      expect(response.status).toBe(422)
      expect(response.data.success).toBe(false)
    })
  })

  describe('PUT /api/issues/{id}/false-positive', () => {
    it('should return 404 for non-existent issue', async () => {
      const fakeIssueId = '00000000-0000-0000-0000-000000000000'
      const response = await apiClient.put(`/api/issues/${fakeIssueId}/false-positive`)
      
      expect(response.status).toBe(404)
      expect(response.data.success).toBe(false)
    })

    it('should require authentication', async () => {
      const fakeIssueId = '00000000-0000-0000-0000-000000000000'
      apiClient.setAuthToken('invalid-token')
      const response = await apiClient.put(`/api/issues/${fakeIssueId}/false-positive`)
      
      expect(response.status).toBe(401)
      expect(response.data.success).toBe(false)
      
      apiClient.setAuthToken(testApiKey.key)
    })

    it('should reject invalid UUID format', async () => {
      const response = await apiClient.put('/api/issues/invalid-uuid/false-positive')
      
      expect(response.status).toBe(422)
      expect(response.data.success).toBe(false)
    })
  })

  describe('POST /api/issues/bulk-update', () => {
    it('should reject empty issue IDs array', async () => {
      const response = await apiClient.post('/api/issues/bulk-update', {
        issueIds: [],
        resolved: true
      })
      
      expect(response.status).toBe(422)
      expect(response.data.success).toBe(false)
    })

    it('should reject too many issue IDs', async () => {
      const tooManyIds = Array(101).fill(0).map(() => crypto.randomUUID())
      const response = await apiClient.post('/api/issues/bulk-update', {
        issueIds: tooManyIds,
        resolved: true
      })
      
      expect(response.status).toBe(422)
      expect(response.data.success).toBe(false)
    })

    it('should reject invalid UUID formats', async () => {
      const response = await apiClient.post('/api/issues/bulk-update', {
        issueIds: ['invalid-uuid'],
        resolved: true
      })
      
      expect(response.status).toBe(422)
      expect(response.data.success).toBe(false)
    })

    it('should reject request with no update fields', async () => {
      const fakeIssueId = '00000000-0000-0000-0000-000000000000'
      const response = await apiClient.post('/api/issues/bulk-update', {
        issueIds: [fakeIssueId]
      })
      
      expect(response.status).toBe(422)
      expect(response.data.success).toBe(false)
    })

    it('should return 404 for non-existent issues', async () => {
      const fakeIssueIds = [
        '00000000-0000-0000-0000-000000000000',
        '11111111-1111-1111-1111-111111111111'
      ]
      const response = await apiClient.post('/api/issues/bulk-update', {
        issueIds: fakeIssueIds,
        resolved: true
      })
      
      expect(response.status).toBe(404)
      expect(response.data.success).toBe(false)
    })

    it('should require authentication', async () => {
      const fakeIssueId = '00000000-0000-0000-0000-000000000000'
      apiClient.setAuthToken('invalid-token')
      const response = await apiClient.post('/api/issues/bulk-update', {
        issueIds: [fakeIssueId],
        resolved: true
      })
      
      expect(response.status).toBe(401)
      expect(response.data.success).toBe(false)
      
      apiClient.setAuthToken(testApiKey.key)
    })

    it('should accept both resolved and falsePositive fields', async () => {
      const fakeIssueId = '00000000-0000-0000-0000-000000000000'
      const response = await apiClient.post('/api/issues/bulk-update', {
        issueIds: [fakeIssueId],
        resolved: true,
        falsePositive: false
      })
      
      // Will return 404 for non-existent issue, but validates input structure
      expect(response.status).toBe(404)
      expect(response.data.success).toBe(false)
    })
  })
})