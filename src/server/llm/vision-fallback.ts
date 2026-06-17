import { logger } from '../utils/logger.js'

export interface VisionModelConfig {
  baseUrl: string
  model: string
  timeout: number
}

interface OllamaChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  images?: string[]
}

interface OllamaChatRequest {
  model: string
  messages: OllamaChatMessage[]
  stream: boolean
  think?: boolean
}

interface OllamaChatResponse {
  message: {
    role: 'user' | 'assistant' | 'system'
    content: string
  }
}

const IMAGE_PROMPT = `Describe this image in detail. Focus on:
- What the image shows (UI, diagram, photo, etc.)
- Any text visible in the image
- Layout and visual structure
- Key elements and their relationships

Provide a concise but comprehensive description.`

export async function describeImage(
  base64Data: string,
  visionModel: VisionModelConfig,
  options?: { context?: string | undefined; signal?: AbortSignal | undefined },
): Promise<string> {
  const timeout = visionModel.timeout

  try {
    const url = `${visionModel.baseUrl}/api/chat`

    const requestBody: OllamaChatRequest = {
      model: visionModel.model,
      messages: [
        {
          role: 'user',
          content: options?.context ? `${IMAGE_PROMPT}\n\nContext: ${options.context}` : IMAGE_PROMPT,
          images: [base64Data],
        },
      ],
      stream: false,
      think: false,
    }

    const timeoutController = new AbortController()
    const timeoutId = setTimeout(() => timeoutController.abort(), timeout)

    const signal = options?.signal
      ? AbortSignal.any([timeoutController.signal, options.signal])
      : timeoutController.signal

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      logger.error('Vision fallback API error', { status: response.status, error: errorText })
      return `[Image description failed: HTTP ${response.status}]`
    }

    const data = (await response.json()) as OllamaChatResponse

    const description = data.message?.content?.trim()
    if (!description) {
      logger.warn('Vision fallback returned empty description')
      return '[Image - could not describe]'
    }

    return description
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Vision fallback error', { error: message })

    if (message.includes('abort')) {
      return '[Image description timed out]'
    }

    return `[Image description failed: ${message}]`
  }
}

export async function describeImageFromDataUrl(
  dataUrl: string,
  visionModel: VisionModelConfig,
  options?: { context?: string | undefined; signal?: AbortSignal | undefined },
): Promise<string> {
  const base64Match = dataUrl.match(/^data:image\/[^;]+;base64,(.+)$/)
  if (!base64Match || !base64Match[1]) {
    return '[Invalid image data URL]'
  }

  return describeImage(base64Match[1], visionModel, options)
}
