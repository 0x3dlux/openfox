import { describe, it, expect, beforeEach, vi } from 'vitest'
import { describeImage, describeImageFromDataUrl } from './vision-fallback.js'
import type { VisionModelConfig } from './vision-fallback.js'

global.fetch = vi.fn()

const testVisionModel: VisionModelConfig = {
  baseUrl: 'http://localhost:11434',
  model: 'qwen3.5:0.8b',
  timeout: 120000,
}

describe('vision-fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetch).mockReset()
  })

  describe('describeImage', () => {
    it('returns description from API', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ message: { content: 'A test image showing a cat' } }),
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response)

      const result = await describeImage('dGVzdA==', testVisionModel)
      expect(result).toBe('A test image showing a cat')
    })

    it('returns error message on API failure', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        text: async () => 'Internal error',
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response)

      const result = await describeImage('dGVzdA==', testVisionModel)
      expect(result).toContain('HTTP 500')
    })

    it('is interrupted by external AbortSignal', async () => {
      const abortController = new AbortController()

      vi.mocked(fetch).mockImplementation(async (_url, init) => {
        return new Promise((_resolve, reject) => {
          if (init?.signal?.aborted) {
            reject(new DOMException('aborted', 'AbortError'))
            return
          }
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('aborted', 'AbortError'))
          })
        })
      })

      const resultPromise = describeImage('dGVzdA==', testVisionModel, { signal: abortController.signal })

      abortController.abort()

      const result = await resultPromise
      expect(result).toContain('timed out')
    })

    it('includes context in the prompt when provided', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ message: { content: 'A test image' } }),
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response)

      await describeImage('dGVzdA==', testVisionModel, { context: 'File: screenshot.png' })

      expect(fetch).toHaveBeenCalled()
      const callArgs = vi.mocked(fetch).mock.calls[0]!
      const body = JSON.parse(callArgs[1]?.body as string)
      expect(body.messages[0].content).toContain('File: screenshot.png')
    })
  })

  describe('describeImageFromDataUrl', () => {
    it('extracts base64 from data URL', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ message: { content: 'A test image' } }),
      }
      vi.mocked(fetch).mockResolvedValue(mockResponse as unknown as Response)

      const dataUrl = 'data:image/png;base64,dGVzdA=='
      const result = await describeImageFromDataUrl(dataUrl, testVisionModel)
      expect(result).toBe('A test image')
    })

    it('returns error for invalid data URL', async () => {
      const result = await describeImageFromDataUrl('not-a-data-url', testVisionModel)
      expect(result).toBe('[Invalid image data URL]')
    })
  })
})
