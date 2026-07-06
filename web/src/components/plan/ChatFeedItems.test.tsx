// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { ChatFeedItems } from './ChatFeedItems'
import type { DisplayItem } from './groupMessages'

function msg(id: string, role: 'user' | 'assistant' = 'user', content = 'Hello'): DisplayItem {
  return {
    type: 'message',
    message: {
      id,
      role,
      content,
      timestamp: new Date().toISOString(),
      isStreaming: false,
    },
  }
}

describe('ChatFeedItems stable keys', () => {
  it('should preserve DOM node identity for shifted items', () => {
    const items = [msg('a', 'user', 'Alpha'), msg('b', 'user', 'Beta'), msg('c', 'user', 'Gamma')]

    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    flushSync(() => root.render(<ChatFeedItems displayItems={items} />))
    const nodeB = container.querySelector('[data-message-id="b"]')
    expect(nodeB).toBeTruthy()
    expect(nodeB?.textContent).toContain('Beta')

    // Simulate shift: 'a' drops out, from [a,b,c] to [b,c]
    const shifted = [msg('b', 'user', 'Beta'), msg('c', 'user', 'Gamma')]
    flushSync(() => root.render(<ChatFeedItems displayItems={shifted} />))

    const nodeB2 = container.querySelector('[data-message-id="b"]')
    expect(nodeB2).toBeTruthy()
    expect(nodeB).toBe(nodeB2)
  })

  it('should re-render when message content changes', () => {
    const items = [msg('a', 'user', 'Hello'), msg('b', 'user', 'World')]

    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    flushSync(() => root.render(<ChatFeedItems displayItems={items} />))
    const firstHtml = container.innerHTML

    flushSync(() =>
      root.render(<ChatFeedItems displayItems={[msg('a', 'user', 'Hello'), msg('b', 'user', 'Updated')]} />),
    )
    expect(container.innerHTML).not.toBe(firstHtml)
    expect(container.textContent).toContain('Updated')
  })

  it('keeps non-streaming message DOM intact when new message appended', () => {
    const items = [msg('a', 'user', 'First'), msg('b', 'user', 'Second')]

    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    flushSync(() => root.render(<ChatFeedItems displayItems={items} />))
    const nodeA = container.querySelector('[data-message-id="a"]')
    const nodeB = container.querySelector('[data-message-id="b"]')

    const items2 = [msg('a', 'user', 'First'), msg('b', 'user', 'Second'), msg('c', 'user', 'Third')]
    flushSync(() => root.render(<ChatFeedItems displayItems={items2} />))

    expect(container.querySelector('[data-message-id="a"]')).toBe(nodeA)
    expect(container.querySelector('[data-message-id="b"]')).toBe(nodeB)
    expect(container.textContent).toContain('Third')
  })
})
