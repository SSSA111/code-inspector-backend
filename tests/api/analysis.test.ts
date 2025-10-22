import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { apiClient, createTestApiKey, cleanupTestData } from '../setup/test-helpers'

describe('Analysis Endpoints', () => {
  let testApiKey: any
  let projectId: string
  let analysisSessionId: string

  beforeAll(async () => {
    testApiKey = await createTestApiKey()
    apiClient.setAuthToken(testApiKey.key)
    
    // Create a test project for analysis
    const projectResponse = await apiClient.post('/api/projects/', {
      name: 'Analysis Test Project',
      type: 'github',
      sourceUrl: 'https://github.com/test/analysis-repo',
      content: '// Sample JavaScript with security vulnerabilities\nconst express = require("express");\nconst app = express();\n\n// SQL Injection vulnerability\napp.get("/user/:id", (req, res) => {\n  const userId = req.params.id;\n  const query = `SELECT * FROM users WHERE id = ${userId}`; // Vulnerable\n  database.query(query, (err, results) => {\n    res.json(results);\n  });\n});\n\n// XSS vulnerability\napp.get("/hello", (req, res) => {\n  const name = req.query.name;\n  res.send(`<h1>Hello ${name}</h1>`); // Vulnerable\n});\n\napp.listen(3000);',
      status: 'active'
    })
    
    if (projectResponse.status !== 201) {
      console.error('Failed to create project:', projectResponse.data)
      throw new Error('Failed to create test project')
    }
    
    projectId = projectResponse.data.data.id
  })

  afterAll(async () => {
    if (testApiKey) {
      await cleanupTestData(testApiKey.id, testApiKey.key)
    }
  })

  describe('POST /api/analysis/analyze', () => {
    it('should complete analysis and return results immediately', async () => {
      const response = await apiClient.post('/api/analysis/analyze', {
        projectId
      })
      
      expect(response.status).toBe(201)
      expect(response.data.success).toBe(true)
      expect(response.data.data.id).toBeDefined()
      expect(response.data.data.projectId).toBe(projectId)
      expect(response.data.data.status).toBe('completed')
      expect(response.data.data.completedAt).toBeDefined()
      expect(response.data.data.processingTimeMs).toBeDefined()
      expect(Array.isArray(response.data.data.securityIssues)).toBe(true)
      expect(response.data.data.overallScore).toBeDefined()
      expect(typeof response.data.data.overallScore).toBe('number')
      expect(response.data.data.createdAt).toBeDefined()
      
      analysisSessionId = response.data.data.id
    })

    it('should require authentication', async () => {
      apiClient.setAuthToken('invalid-token')
      const response = await apiClient.post('/api/analysis/analyze', {
        projectId
      })
      
      expect(response.status).toBe(401)
      expect(response.data.success).toBe(false)
      
      apiClient.setAuthToken(testApiKey.key)
    })

    it('should reject invalid project ID', async () => {
      const response = await apiClient.post('/api/analysis/analyze', {
        projectId: 'invalid-uuid'
      })
      
      expect(response.status).toBe(422)
      expect(response.data.success).toBe(false)
    })

    it('should reject non-existent project', async () => {
      const fakeProjectId = '00000000-0000-0000-0000-000000000000'
      const response = await apiClient.post('/api/analysis/analyze', {
        projectId: fakeProjectId
      })
      
      expect(response.status).toBe(404)
      expect(response.data.success).toBe(false)
    })

    it('should reject missing projectId', async () => {
      const response = await apiClient.post('/api/analysis/analyze', {})
      
      expect(response.status).toBe(422)
      expect(response.data.success).toBe(false)
    })

    it('should calculate issue counts by severity', async () => {
      const response = await apiClient.post('/api/analysis/analyze', {
        projectId
      })
      
      expect(response.status).toBe(201)
      expect(response.data.data.totalIssues).toBeDefined()
      expect(response.data.data.criticalIssues).toBeDefined()
      expect(response.data.data.highIssues).toBeDefined()
      expect(response.data.data.mediumIssues).toBeDefined()
      expect(response.data.data.lowIssues).toBeDefined()
      
      // The sum should equal total issues
      const calculatedTotal = response.data.data.criticalIssues + 
                            response.data.data.highIssues + 
                            response.data.data.mediumIssues + 
                            response.data.data.lowIssues
      expect(calculatedTotal).toBe(response.data.data.totalIssues)
    })

    it('should include AI model information', async () => {
      const response = await apiClient.post('/api/analysis/analyze', {
        projectId
      })
      
      expect(response.status).toBe(201)
      expect(response.data.data.aiModelUsed).toBe('gemini-2.5-flash-lite')
    })
  })

  describe('GET /api/analysis/{sessionId}', () => {
    it('should get analysis results', async () => {
      const response = await apiClient.get(`/api/analysis/${analysisSessionId}`)
      
      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      expect(response.data.data.id).toBe(analysisSessionId)
      expect(response.data.data.projectId).toBe(projectId)
      expect(Array.isArray(response.data.data.securityIssues)).toBe(true)
      expect(response.data.data.status).toBe('completed')
    })

    it('should require authentication', async () => {
      apiClient.setAuthToken('invalid-token')
      const response = await apiClient.get(`/api/analysis/${analysisSessionId}`)
      
      expect(response.status).toBe(401)
      expect(response.data.success).toBe(false)
      
      apiClient.setAuthToken(testApiKey.key)
    })

    it('should return 404 for non-existent session', async () => {
      const fakeSessionId = '00000000-0000-0000-0000-000000000000'
      const response = await apiClient.get(`/api/analysis/${fakeSessionId}`)
      
      expect(response.status).toBe(404)
      expect(response.data.success).toBe(false)
    })

    it('should reject invalid session ID format', async () => {
      const response = await apiClient.get('/api/analysis/invalid-uuid')
      
      expect(response.status).toBe(422)
      expect(response.data.success).toBe(false)
    })

    it('should not access sessions from other users', async () => {
      // Create another user and analysis session
      const otherApiKey = await createTestApiKey()
      apiClient.setAuthToken(otherApiKey.key)
      
      const otherProjectResponse = await apiClient.post('/api/projects/', {
        name: 'Other User Project',
        type: 'github',
        sourceUrl: 'https://github.com/other/repo',
        content: 'console.log("other user analysis project");'
      })
      
      if (otherProjectResponse.status !== 201) {
        throw new Error('Failed to create other user project')
      }
      
      const otherAnalysisResponse = await apiClient.post('/api/analysis/analyze', {
        projectId: otherProjectResponse.data.data.id
      })
      
      if (otherAnalysisResponse.status !== 201) {
        throw new Error('Failed to create other user analysis')
      }
      
      // Switch back to original user
      apiClient.setAuthToken(testApiKey.key)
      
      const response = await apiClient.get(`/api/analysis/${otherAnalysisResponse.data.data.id}`)
      
      expect(response.status).toBe(404)
      expect(response.data.success).toBe(false)
      
      // Cleanup
      await cleanupTestData(otherApiKey.id, otherApiKey.key)
    })
  })

  describe('GET /api/analysis/{sessionId}/export', () => {
    it('should export analysis results as JSON by default', async () => {
      const response = await apiClient.get(`/api/analysis/${analysisSessionId}/export`)
      
      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      expect(response.data.data.analysisSession).toBeDefined()
      expect(response.data.data.projectName).toBeDefined()
      expect(Array.isArray(response.data.data.securityIssues)).toBe(true)
      expect(response.data.data.exportedAt).toBeDefined()
    })

    it('should export analysis results as JSON when specified', async () => {
      const response = await apiClient.get(`/api/analysis/${analysisSessionId}/export?format=json`)
      
      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      expect(response.data.data.analysisSession).toBeDefined()
    })

    it('should handle PDF export format', async () => {
      const response = await apiClient.get(`/api/analysis/${analysisSessionId}/export?format=pdf`)
      
      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      expect(response.data.data.message).toContain('PDF')
    })

    it('should require authentication', async () => {
      apiClient.setAuthToken('invalid-token')
      const response = await apiClient.get(`/api/analysis/${analysisSessionId}/export`)
      
      expect(response.status).toBe(401)
      expect(response.data.success).toBe(false)
      
      apiClient.setAuthToken(testApiKey.key)
    })

    it('should return 404 for non-existent session', async () => {
      const fakeSessionId = '00000000-0000-0000-0000-000000000000'
      const response = await apiClient.get(`/api/analysis/${fakeSessionId}/export`)
      
      expect(response.status).toBe(404)
      expect(response.data.success).toBe(false)
    })

    it('should reject invalid export format', async () => {
      const response = await apiClient.get(`/api/analysis/${analysisSessionId}/export?format=invalid`)
      
      expect(response.status).toBe(422)
      expect(response.data.success).toBe(false)
    })
  })
})