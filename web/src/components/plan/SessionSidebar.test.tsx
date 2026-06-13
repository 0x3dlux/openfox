// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { SessionSidebar } from './SessionSidebar'

vi.mock('../../stores/session', () => ({
  useSessionStore: vi.fn(() => ({
    currentSession: null,
  })),
}))

describe('SessionSidebar', () => {
  it('shows Progress section header', () => {
    const html = renderToStaticMarkup(<SessionSidebar messages={[]} />)

    expect(html).toContain('Progress')
  })

  it('shows Progress section in sidebar', () => {
    const html = renderToStaticMarkup(<SessionSidebar messages={[]} />)

    expect(html).toContain('Progress')
  })
})
