import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { apiClient, createTestApiKey, cleanupTestData } from '../setup/test-helpers'

describe('Chat Endpoints', () => {
  let testApiKey: any
  let projectId: string
  let analysisSessionId: string
  let messageId: string

  beforeAll(async () => {
    testApiKey = await createTestApiKey()
    apiClient.setAuthToken(testApiKey.key)
    
    // Create a test project for chat
    const projectResponse = await apiClient.post('/api/projects/', {
      name: 'Chat Test Project',
      type: 'github',
      sourceUrl: 'https://github.com/test/chat-repo',
      content: 'const express = require("express");\napp.get("/test", (req, res) => {\n  res.send("Hello World");\n});',
      status: 'active'
    })
    
    if (projectResponse.status !== 201) {
      console.error('Failed to create project:', projectResponse.data)
      throw new Error('Failed to create test project')
    }
    
    projectId = projectResponse.data.data.id

    // Create an analysis session for testing message with analysis context
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

  describe('GET /api/chat/projects/{id}/messages', () => {
    it('should get empty chat history for new project', async () => {
      const response = await apiClient.get(`/api/chat/projects/${projectId}/messages`)
      
      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      expect(Array.isArray(response.data.data)).toBe(true)
      expect(response.data.data.length).toBe(0)
    })

    it('should support pagination with limit and offset', async () => {
      const response = await apiClient.get(`/api/chat/projects/${projectId}/messages?limit=10&offset=0`)
      
      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      expect(Array.isArray(response.data.data)).toBe(true)
    })

    it('should filter messages by type', async () => {
      const response = await apiClient.get(`/api/chat/projects/${projectId}/messages?type=user`)
      
      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      expect(Array.isArray(response.data.data)).toBe(true)
    })

    it('should require authentication', async () => {
      apiClient.setAuthToken('invalid-token')
      const response = await apiClient.get(`/api/chat/projects/${projectId}/messages`)
      
      expect(response.status).toBe(401)
      expect(response.data.success).toBe(false)
      
      apiClient.setAuthToken(testApiKey.key)
    })

    it('should return 404 for non-existent project', async () => {
      const fakeProjectId = '00000000-0000-0000-0000-000000000000'
      const response = await apiClient.get(`/api/chat/projects/${fakeProjectId}/messages`)
      
      expect(response.status).toBe(404)
      expect(response.data.success).toBe(false)
    })

    it('should reject invalid project ID format', async () => {
      const response = await apiClient.get('/api/chat/projects/invalid-uuid/messages')
      
      expect(response.status).toBe(422)
      expect(response.data.success).toBe(false)
    })

    it('should reject invalid message type filter', async () => {
      const response = await apiClient.get(`/api/chat/projects/${projectId}/messages?type=invalid`)
      
      expect(response.status).toBe(422)
      expect(response.data.success).toBe(false)
    })

    it('should reject invalid limit values', async () => {
      const response = await apiClient.get(`/api/chat/projects/${projectId}/messages?limit=0`)
      
      expect(response.status).toBe(422)
      expect(response.data.success).toBe(false)
    })

    it('should reject invalid offset values', async () => {
      const response = await apiClient.get(`/api/chat/projects/${projectId}/messages?offset=-1`)
      
      expect(response.status).toBe(422)
      expect(response.data.success).toBe(false)
    })

    it('should not access messages from other users projects', async () => {
      // Create another user and project
      const otherApiKey = await createTestApiKey()
      apiClient.setAuthToken(otherApiKey.key)
      
      const otherProjectResponse = await apiClient.post('/api/projects/', {
        name: 'Other User Chat Project',
        type: 'github',
        sourceUrl: 'https://github.com/other/chat-repo',
        content: 'console.log("other user chat project");'
      })
      
      if (otherProjectResponse.status !== 201) {
        throw new Error('Failed to create other user project')
      }
      
      // Switch back to original user and try to access other user's project
      apiClient.setAuthToken(testApiKey.key)
      
      const response = await apiClient.get(`/api/chat/projects/${otherProjectResponse.data.data.id}/messages`)
      
      expect(response.status).toBe(404)
      expect(response.data.success).toBe(false)
      
      // Cleanup
      await cleanupTestData(otherApiKey.id, otherApiKey.key)
    })
  })

  describe('POST /api/chat/projects/{id}/messages', () => {
    it('should send a user message', async () => {
      const messageData = {
        type: 'user',
        content: 'Hello, this is a test message!'
      }
      
      const response = await apiClient.post(`/api/chat/projects/${projectId}/messages`, messageData)
      
      expect(response.status).toBe(201)
      expect(response.data.success).toBe(true)
      expect(response.data.data.id).toBeDefined()
      expect(response.data.data.projectId).toBe(projectId)
      expect(response.data.data.type).toBe('user')
      expect(response.data.data.content).toBe(messageData.content)
      expect(response.data.data.createdAt).toBeDefined()
      
      messageId = response.data.data.id
    })

    it('should send an assistant message', async () => {
      const messageData = {
        type: 'assistant',
        content: 'This is an assistant response!'
      }
      
      const response = await apiClient.post(`/api/chat/projects/${projectId}/messages`, messageData)
      
      expect(response.status).toBe(201)
      expect(response.data.success).toBe(true)
      expect(response.data.data.type).toBe('assistant')
      expect(response.data.data.content).toBe(messageData.content)
    })

    it('should send message with analysis session context', async () => {
      if (analysisSessionId) {
        const messageData = {
          type: 'user',
          content: 'What issues were found in the analysis?',
          analysisSessionId: analysisSessionId
        }
        
        const response = await apiClient.post(`/api/chat/projects/${projectId}/messages`, messageData)
        
        expect(response.status).toBe(201)
        expect(response.data.success).toBe(true)
        expect(response.data.data.analysisSessionId).toBe(analysisSessionId)
      }
    })

    it('should send message with metadata', async () => {
      const messageData = {
        type: 'user',
        content: 'Message with metadata',
        metadata: JSON.stringify({ 
          fileReferences: ['src/index.js', 'src/utils.js'],
          severity: 'high'
        })
      }
      
      const response = await apiClient.post(`/api/chat/projects/${projectId}/messages`, messageData)
      
      expect(response.status).toBe(201)
      expect(response.data.success).toBe(true)
      expect(response.data.data.metadata).toBe(messageData.metadata)
    })

    it('should default to user type when not specified', async () => {
      const messageData = {
        content: 'Message without explicit type'
      }
      
      const response = await apiClient.post(`/api/chat/projects/${projectId}/messages`, messageData)
      
      expect(response.status).toBe(201)
      expect(response.data.success).toBe(true)
      expect(response.data.data.type).toBe('user')
    })

    it('should require authentication', async () => {
      apiClient.setAuthToken('invalid-token')
      const response = await apiClient.post(`/api/chat/projects/${projectId}/messages`, {
        content: 'Test message'
      })
      
      expect(response.status).toBe(401)
      expect(response.data.success).toBe(false)
      
      apiClient.setAuthToken(testApiKey.key)
    })

    it('should return 404 for non-existent project', async () => {
      const fakeProjectId = '00000000-0000-0000-0000-000000000000'
      const response = await apiClient.post(`/api/chat/projects/${fakeProjectId}/messages`, {
        content: 'Test message'
      })
      
      expect(response.status).toBe(404)
      expect(response.data.success).toBe(false)
    })

    it('should reject empty content', async () => {
      const response = await apiClient.post(`/api/chat/projects/${projectId}/messages`, {
        content: ''
      })
      
      expect(response.status).toBe(422)
      expect(response.data.success).toBe(false)
    })

    it('should reject content that is too long', async () => {
      const longContent = 'x'.repeat(10001) // Exceeds 10000 char limit
      const response = await apiClient.post(`/api/chat/projects/${projectId}/messages`, {
        content: longContent
      })
      
      expect(response.status).toBe(422)
      expect(response.data.success).toBe(false)
    })

    it('should reject invalid message type', async () => {
      const response = await apiClient.post(`/api/chat/projects/${projectId}/messages`, {
        type: 'invalid',
        content: 'Test message'
      })
      
      expect(response.status).toBe(422)
      expect(response.data.success).toBe(false)
    })

    it('should reject invalid analysis session ID format', async () => {
      const response = await apiClient.post(`/api/chat/projects/${projectId}/messages`, {
        content: 'Test message',
        analysisSessionId: 'invalid-uuid'
      })
      
      expect(response.status).toBe(422)
      expect(response.data.success).toBe(false)
    })

    it('should reject invalid JSON metadata', async () => {
      const response = await apiClient.post(`/api/chat/projects/${projectId}/messages`, {
        content: 'Test message',
        metadata: 'invalid-json{'
      })
      
      expect(response.status).toBe(422)
      expect(response.data.success).toBe(false)
    })

    it('should reject missing content field', async () => {
      const response = await apiClient.post(`/api/chat/projects/${projectId}/messages`, {
        type: 'user'
      })
      
      expect(response.status).toBe(422)
      expect(response.data.success).toBe(false)
    })
  })

  describe('DELETE /api/chat/projects/{id}/messages', () => {
    it('should clear chat history', async () => {
      // First verify we have messages
      const getResponse = await apiClient.get(`/api/chat/projects/${projectId}/messages`)
      expect(getResponse.status).toBe(200)
      expect(getResponse.data.data.length).toBeGreaterThan(0)
      
      // Clear the messages
      const response = await apiClient.delete(`/api/chat/projects/${projectId}/messages`)
      
      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      expect(response.data.data.deletedCount).toBeDefined()
      expect(typeof response.data.data.deletedCount).toBe('number')
      expect(response.data.data.deletedCount).toBeGreaterThan(0)
      
      // Verify messages are cleared
      const verifyResponse = await apiClient.get(`/api/chat/projects/${projectId}/messages`)
      expect(verifyResponse.status).toBe(200)
      expect(verifyResponse.data.data.length).toBe(0)
    })

    it('should return zero deleted count for project with no messages', async () => {
      // Create a new project with no messages
      const newProjectResponse = await apiClient.post('/api/projects/', {
        name: 'Empty Chat Project',
        type: 'github',
        sourceUrl: 'https://github.com/test/empty-chat-repo',
        content: 'console.log("empty chat project");'
      })
      
      if (newProjectResponse.status !== 201) {
        throw new Error('Failed to create empty chat project')
      }
      
      const newProjectId = newProjectResponse.data.data.id
      
      const response = await apiClient.delete(`/api/chat/projects/${newProjectId}/messages`)
      
      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      expect(response.data.data.deletedCount).toBe(0)
    })

    it('should require authentication', async () => {
      apiClient.setAuthToken('invalid-token')
      const response = await apiClient.delete(`/api/chat/projects/${projectId}/messages`)
      
      expect(response.status).toBe(401)
      expect(response.data.success).toBe(false)
      
      apiClient.setAuthToken(testApiKey.key)
    })

    it('should return 404 for non-existent project', async () => {
      const fakeProjectId = '00000000-0000-0000-0000-000000000000'
      const response = await apiClient.delete(`/api/chat/projects/${fakeProjectId}/messages`)
      
      expect(response.status).toBe(404)
      expect(response.data.success).toBe(false)
    })

    it('should reject invalid project ID format', async () => {
      const response = await apiClient.delete('/api/chat/projects/invalid-uuid/messages')
      
      expect(response.status).toBe(422)
      expect(response.data.success).toBe(false)
    })

    it('should not clear messages from other users projects', async () => {
      // Create another user and project with messages
      const otherApiKey = await createTestApiKey()
      apiClient.setAuthToken(otherApiKey.key)
      
      const otherProjectResponse = await apiClient.post('/api/projects/', {
        name: 'Other User Clear Project',
        type: 'github',
        sourceUrl: 'https://github.com/other/clear-repo',
        content: 'console.log("other user clear project");'
      })
      
      if (otherProjectResponse.status !== 201) {
        throw new Error('Failed to create other user project')
      }
      
      await apiClient.post(`/api/chat/projects/${otherProjectResponse.data.data.id}/messages`, {
        content: 'Other user message'
      })
      
      // Switch back to original user and try to clear other user's messages
      apiClient.setAuthToken(testApiKey.key)
      
      const response = await apiClient.delete(`/api/chat/projects/${otherProjectResponse.data.data.id}/messages`)
      
      expect(response.status).toBe(404)
      expect(response.data.success).toBe(false)
      
      // Cleanup
      await cleanupTestData(otherApiKey.id, otherApiKey.key)
    })
  })

  describe('Chat Message Flow Integration', () => {
    it('should support complete chat conversation flow', async () => {
      // Create a fresh project for this integration test
      const projectResponse = await apiClient.post('/api/projects/', {
        name: 'Chat Flow Test Project',
        type: 'github',
        sourceUrl: 'https://github.com/test/chat-flow-repo',
        content: 'console.log("chat flow test project");'
      })
      
      if (projectResponse.status !== 201) {
        throw new Error('Failed to create chat flow test project')
      }
      
      const testProjectId = projectResponse.data.data.id
      
      // Send a user message
      const userMessage = await apiClient.post(`/api/chat/projects/${testProjectId}/messages`, {
        type: 'user',
        content: 'Can you analyze this project for security issues?'
      })
      expect(userMessage.status).toBe(201)
      
      // Send an assistant response
      const assistantMessage = await apiClient.post(`/api/chat/projects/${testProjectId}/messages`, {
        type: 'assistant',
        content: 'I\'ll analyze your project. Let me start by examining the code structure.'
      })
      expect(assistantMessage.status).toBe(201)
      
      // Get chat history and verify order
      const history = await apiClient.get(`/api/chat/projects/${testProjectId}/messages`)
      expect(history.status).toBe(200)
      expect(history.data.data.length).toBe(2)
      expect(history.data.data[0].type).toBe('user') // Should be oldest first
      expect(history.data.data[1].type).toBe('assistant')
      
      // Clear chat history
      const clearResponse = await apiClient.delete(`/api/chat/projects/${testProjectId}/messages`)
      expect(clearResponse.status).toBe(200)
      expect(clearResponse.data.data.deletedCount).toBe(2)
      
      // Verify history is empty
      const emptyHistory = await apiClient.get(`/api/chat/projects/${testProjectId}/messages`)
      expect(emptyHistory.data.data.length).toBe(0)
    })
  })
})