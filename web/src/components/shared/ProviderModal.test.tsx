// @vitest-environment happy-dom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { createRoot } from 'react-dom/client'
import { ProviderModal } from './ProviderModal'
import type { ProviderFormData } from './ProviderModal'

describe('ProviderModal - thinkingLevel persistence', () => {
  let container: HTMLElement
  let root: ReturnType<typeof createRoot>
  let onSaveMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    onSaveMock = vi.fn()
  })

  afterEach(() => {
    root.unmount()
    document.body.removeChild(container)
  })

  async function renderAndSave(thinkingLevel?: string) {
    const modelId = 'test-model'
    await new Promise<void>((resolve) => {
      root.render(
        <ProviderModal
          isOpen={true}
          onClose={vi.fn()}
          onSave={onSaveMock as (provider: ProviderFormData) => void}
          initialStep={2}
          editProvider={{
            id: 'test-provider',
            name: 'Test Provider',
            url: 'http://localhost:8000/v1',
            backend: 'vllm',
            models: [
              {
                id: modelId,
                contextWindow: 200000,
                thinkingEnabled: true,
              },
            ],
          }}
          editModelId={modelId}
        />,
      )
      // Wait for useEffect to initialize modelConfigs from editProvider
      setTimeout(resolve, 200)
    })

    // Find the reasoning effort input (shows 'max' as default)
    const effortInput = container.querySelector('input[type="text"]') as HTMLInputElement | null

    if (thinkingLevel !== undefined && effortInput) {
      // React controlled components listen to 'input' event with native setter
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
      nativeInputValueSetter?.call(effortInput, thinkingLevel)
      effortInput.dispatchEvent(new Event('input', { bubbles: true }))
    }

    // Click "Next — Review"
    const nextButton = container.querySelector('[data-testid="provider-modal-next"]') as HTMLButtonElement | null
    if (nextButton) nextButton.click()

    // Wait for state update
    await new Promise((resolve) => setTimeout(resolve, 50))

    // Click "Save Provider"
    const saveButton = container.querySelector('[data-testid="provider-modal-save"]') as HTMLButtonElement | null
    if (saveButton) saveButton.click()

    return { modelId }
  }

  it('includes thinkingLevel in save payload when user sets reasoning effort', async () => {
    const { modelId } = await renderAndSave('high')

    expect(onSaveMock).toHaveBeenCalledTimes(1)
    const savedData: ProviderFormData = onSaveMock.mock.calls[0]![0]!
    const savedModel = savedData.models.find((m) => m.id === modelId)
    expect(savedModel).toBeDefined()
    expect(savedModel?.thinkingLevel).toBe('high')
  })

  it('includes thinkingLevel in save payload even when user leaves default', async () => {
    const { modelId } = await renderAndSave(undefined)

    expect(onSaveMock).toHaveBeenCalledTimes(1)
    const savedData: ProviderFormData = onSaveMock.mock.calls[0]![0]!
    const savedModel = savedData.models.find((m) => m.id === modelId)
    expect(savedModel).toBeDefined()
    // DESIRED BEHAVIOR: when thinkingEnabled is true and the input shows 'max'
    // as default, the save payload should include thinkingLevel: 'max'
    expect(savedModel?.thinkingLevel).toBe('max')
  })
})
