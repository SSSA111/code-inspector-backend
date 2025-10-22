import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { apiClient, createTestApiKey, cleanupTestData } from '../setup/test-helpers'
import testData from '../fixtures/test-data.json'

describe('Projects Endpoints', () => {
  let testApiKey: any
  let projectId: string
  let secondProjectId: string

  beforeAll(async () => {
    testApiKey = await createTestApiKey()
    apiClient.setAuthToken(testApiKey.key)
  })

  afterAll(async () => {
    if (testApiKey) {
      await cleanupTestData(testApiKey.id, testApiKey.key)
    }
  })

  describe('POST /api/projects/', () => {
    it('should create a new project', async () => {
      const response = await apiClient.post('/api/projects/', testData.validProject)
      
      expect(response.status).toBe(201)
      expect(response.data.success).toBe(true)
      expect(response.data.data.name).toBe(testData.validProject.name)
      expect(response.data.data.type).toBe(testData.validProject.type)
      expect(response.data.data.sourceUrl).toBe(testData.validProject.sourceUrl)
      expect(response.data.data.content).toBe(testData.validProject.content)
      expect(response.data.data.status).toBe(testData.validProject.status)
      expect(response.data.data.id).toBeDefined()
      expect(response.data.data.createdAt).toBeDefined()
      expect(response.data.data.updatedAt).toBeDefined()
      
      projectId = response.data.data.id
    })

    it('should create a folder-type project', async () => {
      const folderProject = {
        name: 'Local Folder Project',
        type: 'folder',
        sourceUrl: '/local/path/project',
        content: 'const fs = require("fs");\n\n// Potential path traversal vulnerability\napp.get("/file", (req, res) => {\n  const filename = req.query.file;\n  fs.readFile("./files/" + filename, (err, data) => {\n    res.send(data);\n  });\n});',
        status: 'active'
      }

      const response = await apiClient.post('/api/projects/', folderProject)
      
      expect(response.status).toBe(201)
      expect(response.data.success).toBe(true)
      expect(response.data.data.type).toBe('folder')
      
      secondProjectId = response.data.data.id
    })

    it('should require authentication', async () => {
      apiClient.setAuthToken('invalid-token')
      const response = await apiClient.post('/api/projects/', testData.validProject)
      
      expect(response.status).toBe(401)
      expect(response.data.success).toBe(false)
      
      // Reset auth
      apiClient.setAuthToken(testApiKey.key)
    })

    it('should reject invalid project data - empty name', async () => {
      const invalidProject = {
        name: '',
        type: 'github',
        sourceUrl: 'https://github.com/test/repo',
        content: 'console.log("test");'
      }

      const response = await apiClient.post('/api/projects/', invalidProject)
      
      expect(response.status).toBe(422)
      expect(response.data.success).toBe(false)
    })

    it('should reject invalid project data - invalid type', async () => {
      const invalidProject = {
        name: 'Test Project',
        type: 'invalid-type',
        sourceUrl: 'https://github.com/test/repo',
        content: 'console.log("test");'
      }

      const response = await apiClient.post('/api/projects/', invalidProject)
      
      expect(response.status).toBe(422)
      expect(response.data.success).toBe(false)
    })

    it('should reject invalid project data - invalid sourceUrl', async () => {
      const invalidProject = {
        name: 'Test Project',
        type: 'github',
        sourceUrl: 'not-a-valid-url',
        content: 'console.log("test");'
      }

      const response = await apiClient.post('/api/projects/', invalidProject)
      
      expect(response.status).toBe(422)
      expect(response.data.success).toBe(false)
    })

    it('should reject missing required fields', async () => {
      const incompleteProject = {
        name: 'Test Project'
        // Missing type, sourceUrl, and content
      }

      const response = await apiClient.post('/api/projects/', incompleteProject)
      
      expect(response.status).toBe(422)
      expect(response.data.success).toBe(false)
    })
  })

  describe('GET /api/projects/', () => {
    it('should list user projects', async () => {
      const response = await apiClient.get('/api/projects/')
      
      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      expect(Array.isArray(response.data.data)).toBe(true)
      expect(response.data.data.length).toBeGreaterThanOrEqual(2) // We created at least 2 projects
      
      // Check that our created projects are in the list
      const projectNames = response.data.data.map((p: any) => p.name)
      expect(projectNames).toContain(testData.validProject.name)
      expect(projectNames).toContain('Local Folder Project')
    })

    it('should require authentication', async () => {
      apiClient.setAuthToken('invalid-token')
      const response = await apiClient.get('/api/projects/')
      
      expect(response.status).toBe(401)
      expect(response.data.success).toBe(false)
      
      // Reset auth
      apiClient.setAuthToken(testApiKey.key)
    })

    it('should return empty array for user with no projects', async () => {
      // Create a new API key for a fresh user
      const newApiKey = await createTestApiKey()
      apiClient.setAuthToken(newApiKey.key)
      
      const response = await apiClient.get('/api/projects/')
      
      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      expect(response.data.data).toEqual([])
      
      // Cleanup and reset auth
      await cleanupTestData(newApiKey.id, newApiKey.key)
      apiClient.setAuthToken(testApiKey.key)
    })
  })

  describe('GET /api/projects/:id', () => {
    it('should get project details', async () => {
      // Create a fresh project for this test
      const createResponse = await apiClient.post('/api/projects/', {
        name: 'Project for Get Details Test',
        type: 'github',
        sourceUrl: 'https://github.com/test/get-details-repo',
        content: 'console.log("get details test");'
      })
      expect(createResponse.status).toBe(201)
      const testProjectId = createResponse.data.data.id
      
      const response = await apiClient.get(`/api/projects/${testProjectId}`)
      
      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      expect(response.data.data.id).toBe(testProjectId)
      expect(response.data.data.name).toBe('Project for Get Details Test')
      expect(response.data.data.type).toBe('github')
    })

    it('should require authentication', async () => {
      // Create a fresh project for this test
      const createResponse = await apiClient.post('/api/projects/', {
        name: 'Project for Get Auth Test',
        type: 'github',
        sourceUrl: 'https://github.com/test/get-auth-repo',
        content: 'console.log("auth test");'
      })
      expect(createResponse.status).toBe(201)
      const testProjectId = createResponse.data.data.id
      
      apiClient.setAuthToken('invalid-token')
      const response = await apiClient.get(`/api/projects/${testProjectId}`)
      
      expect(response.status).toBe(401)
      expect(response.data.success).toBe(false)
      
      // Reset auth
      apiClient.setAuthToken(testApiKey.key)
    })

    it('should return 404 for non-existent project', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'
      const response = await apiClient.get(`/api/projects/${fakeId}`)
      
      expect(response.status).toBe(404)
      expect(response.data.success).toBe(false)
    })

    it('should return 404 for project belonging to another user', async () => {
      // Create a new API key and project for another user
      const otherApiKey = await createTestApiKey()
      apiClient.setAuthToken(otherApiKey.key)
      
      const otherProject = await apiClient.post('/api/projects/', {
        name: 'Other User Project',
        type: 'github',
        sourceUrl: 'https://github.com/other/repo',
        content: 'console.log("other user project");'
      })
      const otherProjectId = otherProject.data.data.id
      
      // Switch back to original user and try to access other user's project
      apiClient.setAuthToken(testApiKey.key)
      const response = await apiClient.get(`/api/projects/${otherProjectId}`)
      
      expect(response.status).toBe(404)
      expect(response.data.success).toBe(false)
      
      // Cleanup
      await cleanupTestData(otherApiKey.id, otherApiKey.key)
    })

    it('should reject invalid UUID format', async () => {
      const response = await apiClient.get('/api/projects/invalid-uuid')
      
      expect(response.status).toBe(422)
      expect(response.data.success).toBe(false)
    })
  })

  describe('PUT /api/projects/:id', () => {
    it('should update project details', async () => {
      // Create a fresh project for this test
      const createResponse = await apiClient.post('/api/projects/', {
        name: 'Project for Update Test',
        type: 'github',
        sourceUrl: 'https://github.com/test/update-repo',
        content: 'console.log("update test");',
        status: 'active'
      })
      expect(createResponse.status).toBe(201)
      const testProjectId = createResponse.data.data.id
      
      const updateData = {
        name: 'Updated Project Name',
        status: 'archived'
      }
      
      const response = await apiClient.put(`/api/projects/${testProjectId}`, updateData)
      
      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      expect(response.data.data.name).toBe(updateData.name)
      expect(response.data.data.status).toBe(updateData.status)
      expect(response.data.data.updatedAt).toBeDefined()
    })

    it('should update only provided fields', async () => {
      // Create a fresh project for this test
      const createResponse = await apiClient.post('/api/projects/', {
        name: 'Project for Partial Update Test',
        type: 'folder',
        sourceUrl: '/test/partial-update',
        content: 'console.log("partial update test");',
        status: 'active'
      })
      expect(createResponse.status).toBe(201)
      const testProjectId = createResponse.data.data.id
      
      const updateData = {
        status: 'archived'
      }
      
      const response = await apiClient.put(`/api/projects/${testProjectId}`, updateData)
      
      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      expect(response.data.data.status).toBe('archived')
      expect(response.data.data.name).toBe('Project for Partial Update Test') // Should remain unchanged
    })

    it('should require authentication', async () => {
      // Create a fresh project for this test
      const createResponse = await apiClient.post('/api/projects/', {
        name: 'Project for Auth Test',
        type: 'github',
        sourceUrl: 'https://github.com/test/auth-repo',
        content: 'console.log("auth test");'
      })
      expect(createResponse.status).toBe(201)
      const testProjectId = createResponse.data.data.id
      
      apiClient.setAuthToken('invalid-token')
      const response = await apiClient.put(`/api/projects/${testProjectId}`, { name: 'Updated Name' })
      
      expect(response.status).toBe(401)
      expect(response.data.success).toBe(false)
      
      // Reset auth
      apiClient.setAuthToken(testApiKey.key)
    })

    it('should return 404 for non-existent project', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'
      const response = await apiClient.put(`/api/projects/${fakeId}`, { name: 'Updated Name' })
      
      expect(response.status).toBe(404)
      expect(response.data.success).toBe(false)
    })

    it('should reject invalid update data', async () => {
      // Create a fresh project for this test
      const createResponse = await apiClient.post('/api/projects/', {
        name: 'Project for Validation Test',
        type: 'github',
        sourceUrl: 'https://github.com/test/validation-repo',
        content: 'console.log("validation test");'
      })
      expect(createResponse.status).toBe(201)
      const testProjectId = createResponse.data.data.id
      
      const invalidUpdate = {
        name: '', // Empty name should be rejected
        type: 'invalid-type'
      }
      
      const response = await apiClient.put(`/api/projects/${testProjectId}`, invalidUpdate)
      
      expect(response.status).toBe(422)
      expect(response.data.success).toBe(false)
    })
  })

  describe('GET /api/projects/:id/history', () => {
    it('should get project analysis history', async () => {
      // Create a fresh project for this test
      const createResponse = await apiClient.post('/api/projects/', {
        name: 'Project for History Test',
        type: 'github',
        sourceUrl: 'https://github.com/test/history-repo',
        content: 'console.log("history test");'
      })
      expect(createResponse.status).toBe(201)
      const testProjectId = createResponse.data.data.id
      
      const response = await apiClient.get(`/api/projects/${testProjectId}/history`)
      
      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      expect(Array.isArray(response.data.data)).toBe(true)
      // Should be empty initially since we haven't run any analyses
      expect(response.data.data.length).toBe(0)
    })

    it('should require authentication', async () => {
      // Create a fresh project for this test
      const createResponse = await apiClient.post('/api/projects/', {
        name: 'Project for History Auth Test',
        type: 'github',
        sourceUrl: 'https://github.com/test/history-auth-repo',
        content: 'console.log("history auth test");'
      })
      expect(createResponse.status).toBe(201)
      const testProjectId = createResponse.data.data.id
      
      apiClient.setAuthToken('invalid-token')
      const response = await apiClient.get(`/api/projects/${testProjectId}/history`)
      
      expect(response.status).toBe(401)
      expect(response.data.success).toBe(false)
      
      // Reset auth
      apiClient.setAuthToken(testApiKey.key)
    })

    it('should return 404 for non-existent project', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'
      const response = await apiClient.get(`/api/projects/${fakeId}/history`)
      
      expect(response.status).toBe(404)
      expect(response.data.success).toBe(false)
    })
  })

  describe('DELETE /api/projects/:id', () => {
    it('should require authentication', async () => {
      // Create a fresh project for this test
      const createResponse = await apiClient.post('/api/projects/', {
        name: 'Project for Delete Auth Test',
        type: 'github',
        sourceUrl: 'https://github.com/test/delete-auth-repo',
        content: 'console.log("delete auth test");'
      })
      expect(createResponse.status).toBe(201)
      const testProjectId = createResponse.data.data.id
      
      apiClient.setAuthToken('invalid-token')
      const response = await apiClient.delete(`/api/projects/${testProjectId}`)
      
      expect(response.status).toBe(401)
      expect(response.data.success).toBe(false)
      
      // Reset auth
      apiClient.setAuthToken(testApiKey.key)
    })

    it('should return 404 for non-existent project', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000'
      const response = await apiClient.delete(`/api/projects/${fakeId}`)
      
      expect(response.status).toBe(404)
      expect(response.data.success).toBe(false)
    })

    it('should delete a project', async () => {
      // Create a fresh project for this test
      const createResponse = await apiClient.post('/api/projects/', {
        name: 'Project for Delete Test',
        type: 'folder',
        sourceUrl: '/test/delete-project',
        content: 'console.log("delete test");'
      })
      expect(createResponse.status).toBe(201)
      const testProjectId = createResponse.data.data.id
      
      const response = await apiClient.delete(`/api/projects/${testProjectId}`)
      
      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      
      // Verify project is deleted
      const getResponse = await apiClient.get(`/api/projects/${testProjectId}`)
      expect(getResponse.status).toBe(404)
    })

    it('should delete the main test project', async () => {
      // Create a fresh project for this test
      const createResponse = await apiClient.post('/api/projects/', {
        name: 'Main Project for Delete Test',
        type: 'github',
        sourceUrl: 'https://github.com/test/main-delete-repo',
        content: 'console.log("main delete test");'
      })
      expect(createResponse.status).toBe(201)
      const testProjectId = createResponse.data.data.id
      
      const response = await apiClient.delete(`/api/projects/${testProjectId}`)
      
      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      
      // Verify project is deleted
      const getResponse = await apiClient.get(`/api/projects/${testProjectId}`)
      expect(getResponse.status).toBe(404)
    })

    it('should return 404 when trying to delete same project twice', async () => {
      // Create and delete a project
      const createResponse = await apiClient.post('/api/projects/', {
        name: 'Project for Double Delete Test',
        type: 'github',
        sourceUrl: 'https://github.com/test/double-delete-repo',
        content: 'console.log("double delete test");'
      })
      expect(createResponse.status).toBe(201)
      const testProjectId = createResponse.data.data.id
      
      // First deletion should succeed
      const firstResponse = await apiClient.delete(`/api/projects/${testProjectId}`)
      expect(firstResponse.status).toBe(200)
      
      // Second deletion should return 404
      const secondResponse = await apiClient.delete(`/api/projects/${testProjectId}`)
      expect(secondResponse.status).toBe(404)
    })
  })
})