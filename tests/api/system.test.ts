import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { apiClient, createTestApiKey, cleanupTestData } from '../setup/test-helpers'

describe('System Endpoints', () => {
  let testApiKey: any

  beforeAll(async () => {
    testApiKey = await createTestApiKey()
  })

  afterAll(async () => {
    if (testApiKey) {
      await cleanupTestData(testApiKey.id, testApiKey.key)
    }
  })

  describe('GET /api/system/health', () => {
    it('should return system health status', async () => {
      const response = await apiClient.get('/api/system/health')
      
      expect(response.status).toBeOneOf([200, 503]) // Healthy or unhealthy
      expect(response.data.success).toBe(true)
      expect(response.data.data.status).toBeOneOf(['healthy', 'degraded', 'unhealthy'])
      expect(response.data.data.timestamp).toBeDefined()
      expect(typeof response.data.data.uptime).toBe('number')
      expect(response.data.data.uptime).toBeGreaterThanOrEqual(0)
      expect(response.data.data.version).toBeDefined()
      expect(response.data.data.services).toBeDefined()
    })

    it('should include service health information', async () => {
      const response = await apiClient.get('/api/system/health')
      
      expect(response.data.data.services.database).toBeDefined()
      expect(response.data.data.services.database.status).toBeOneOf(['healthy', 'degraded', 'unhealthy'])
      expect(typeof response.data.data.services.database.responseTime).toBe('number')
      
      expect(response.data.data.services.ai).toBeDefined()
      expect(response.data.data.services.ai.status).toBeOneOf(['healthy', 'degraded', 'unhealthy'])
      
      expect(response.data.data.services.storage).toBeDefined()
      expect(response.data.data.services.storage.status).toBeOneOf(['healthy', 'degraded', 'unhealthy'])
    })

    it('should not require authentication', async () => {
      // Health check should be public
      const response = await apiClient.get('/api/system/health')
      
      expect(response.status).toBeOneOf([200, 503])
      expect(response.data.success).toBe(true)
    })

    it('should return consistent structure for healthy system', async () => {
      const response = await apiClient.get('/api/system/health')
      
      // Test structure regardless of actual health status
      expect(response.data.data).toHaveProperty('status')
      expect(response.data.data).toHaveProperty('timestamp')
      expect(response.data.data).toHaveProperty('uptime')
      expect(response.data.data).toHaveProperty('services')
      expect(response.data.data).toHaveProperty('version')
    })

    it('should have reasonable response time', async () => {
      const startTime = Date.now()
      const response = await apiClient.get('/api/system/health')
      const responseTime = Date.now() - startTime
      
      expect(response.status).toBeOneOf([200, 503])
      expect(responseTime).toBeLessThan(5000) // Should respond within 5 seconds
    })
  })

  describe('GET /api/system/supported-languages', () => {
    it('should return supported programming languages', async () => {
      const response = await apiClient.get('/api/system/supported-languages')
      
      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      expect(Array.isArray(response.data.data.languages)).toBe(true)
      expect(response.data.data.languages.length).toBeGreaterThan(0)
      expect(typeof response.data.data.totalLanguages).toBe('number')
      expect(Array.isArray(response.data.data.categories)).toBe(true)
      expect(response.data.data.lastUpdated).toBeDefined()
    })

    it('should include required language properties', async () => {
      const response = await apiClient.get('/api/system/supported-languages')
      
      const languages = response.data.data.languages
      
      languages.forEach((language: any) => {
        expect(language.name).toBeDefined()
        expect(typeof language.name).toBe('string')
        expect(Array.isArray(language.extensions)).toBe(true)
        expect(language.extensions.length).toBeGreaterThan(0)
        expect(language.category).toBeDefined()
        expect(['web', 'backend', 'mobile', 'database', 'config', 'script']).toContain(language.category)
        expect(typeof language.analysisSupported).toBe('boolean')
        
        if (language.detectionPatterns) {
          expect(Array.isArray(language.detectionPatterns)).toBe(true)
        }
      })
    })

    it('should include common programming languages', async () => {
      const response = await apiClient.get('/api/system/supported-languages')
      
      const languageNames = response.data.data.languages.map((lang: any) => lang.name)
      
      const expectedLanguages = ['JavaScript', 'TypeScript', 'Python', 'Go', 'Rust']
      expectedLanguages.forEach(expectedLang => {
        expect(languageNames).toContain(expectedLang)
      })
    })

    it('should categorize languages properly', async () => {
      const response = await apiClient.get('/api/system/supported-languages')
      
      const categories = response.data.data.categories
      const expectedCategories = ['web', 'backend', 'config', 'script']
      
      expectedCategories.forEach(category => {
        expect(categories).toContain(category)
      })
    })

    it('should not require authentication', async () => {
      // Supported languages should be public information
      const response = await apiClient.get('/api/system/supported-languages')
      
      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
    })

    it('should have file extensions for each language', async () => {
      const response = await apiClient.get('/api/system/supported-languages')
      
      response.data.data.languages.forEach((language: any) => {
        expect(language.extensions.length).toBeGreaterThan(0)
        language.extensions.forEach((ext: string) => {
          expect(ext).toMatch(/^\.\w+(\.\w+)*$/) // Should start with dot and contain word characters, allowing multiple dot-separated parts
        })
      })
    })
  })

  describe('GET /api/system/limits', () => {
    beforeAll(() => {
      apiClient.setAuthToken(testApiKey.key)
    })

    it('should return system limits and quotas', async () => {
      const response = await apiClient.get('/api/system/limits')
      
      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
      expect(response.data.data.rateLimits).toBeDefined()
      expect(response.data.data.quotas).toBeDefined()
      expect(response.data.data.features).toBeDefined()
      expect(response.data.data.storage).toBeDefined()
    })

    it('should include rate limit information', async () => {
      const response = await apiClient.get('/api/system/limits')
      
      const rateLimits = response.data.data.rateLimits
      
      expect(typeof rateLimits.requestsPerMinute).toBe('number')
      expect(rateLimits.requestsPerMinute).toBeGreaterThan(0)
      expect(typeof rateLimits.requestsPerHour).toBe('number')
      expect(rateLimits.requestsPerHour).toBeGreaterThan(0)
      expect(typeof rateLimits.requestsPerDay).toBe('number')
      expect(rateLimits.requestsPerDay).toBeGreaterThan(0)
      expect(typeof rateLimits.burstLimit).toBe('number')
      expect(rateLimits.burstLimit).toBeGreaterThan(0)
    })

    it('should include quota information', async () => {
      const response = await apiClient.get('/api/system/limits')
      
      const quotas = response.data.data.quotas
      
      expect(typeof quotas.maxProjectsPerUser).toBe('number')
      expect(quotas.maxProjectsPerUser).toBeGreaterThan(0)
      expect(typeof quotas.maxFilesPerProject).toBe('number')
      expect(quotas.maxFilesPerProject).toBeGreaterThan(0)
      expect(typeof quotas.maxFileSizeMB).toBe('number')
      expect(quotas.maxFileSizeMB).toBeGreaterThan(0)
      expect(typeof quotas.maxTotalUploadSizeMB).toBe('number')
      expect(quotas.maxTotalUploadSizeMB).toBeGreaterThan(0)
      expect(typeof quotas.maxAnalysisPerDay).toBe('number')
      expect(quotas.maxAnalysisPerDay).toBeGreaterThan(0)
      expect(typeof quotas.maxChatMessagesPerProject).toBe('number')
      expect(quotas.maxChatMessagesPerProject).toBeGreaterThan(0)
    })

    it('should include feature information', async () => {
      const response = await apiClient.get('/api/system/limits')
      
      const features = response.data.data.features
      
      expect(typeof features.githubIntegration).toBe('boolean')
      expect(typeof features.realTimeAnalysis).toBe('boolean')
      expect(typeof features.bulkOperations).toBe('boolean')
      expect(typeof features.apiAccess).toBe('boolean')
      expect(Array.isArray(features.exportFormats)).toBe(true)
      expect(features.exportFormats.length).toBeGreaterThan(0)
    })

    it('should include storage information', async () => {
      const response = await apiClient.get('/api/system/limits')
      
      const storage = response.data.data.storage
      
      expect(typeof storage.maxStoragePerUserGB).toBe('number')
      expect(storage.maxStoragePerUserGB).toBeGreaterThan(0)
      expect(typeof storage.retentionDays).toBe('number')
      expect(storage.retentionDays).toBeGreaterThan(0)
      expect(typeof storage.backupEnabled).toBe('boolean')
    })

    it('should require authentication', async () => {
      apiClient.setAuthToken('invalid-token')
      const response = await apiClient.get('/api/system/limits')
      
      expect(response.status).toBe(401)
      expect(response.data.success).toBe(false)
      
      apiClient.setAuthToken(testApiKey.key)
    })

    it('should have reasonable limit values', async () => {
      const response = await apiClient.get('/api/system/limits')
      
      const { rateLimits, quotas } = response.data.data
      
      // Rate limits should make sense (higher periods = higher limits)
      expect(rateLimits.requestsPerHour).toBeGreaterThan(rateLimits.requestsPerMinute)
      expect(rateLimits.requestsPerDay).toBeGreaterThan(rateLimits.requestsPerHour)
      
      // Quotas should be reasonable
      expect(quotas.maxTotalUploadSizeMB).toBeGreaterThanOrEqual(quotas.maxFileSizeMB)
      expect(quotas.maxProjectsPerUser).toBeLessThan(1000) // Reasonable upper bound
      expect(quotas.maxFilesPerProject).toBeLessThan(10000) // Reasonable upper bound
    })

    it('should include supported export formats', async () => {
      const response = await apiClient.get('/api/system/limits')
      
      const exportFormats = response.data.data.features.exportFormats
      
      expect(exportFormats).toContain('json')
      expect(exportFormats.length).toBeGreaterThan(0)
      
      exportFormats.forEach((format: string) => {
        expect(typeof format).toBe('string')
        expect(format.length).toBeGreaterThan(0)
      })
    })
  })
})

// Helper to extend expect with custom matchers
declare global {
  namespace Vi {
    interface Assertion {
      toBeOneOf(values: any[]): Assertion
    }
  }
}

expect.extend({
  toBeOneOf(received, values) {
    const pass = values.includes(received)
    return {
      pass,
      message: () => `expected ${received} to be one of ${values.join(', ')}`
    }
  }
})