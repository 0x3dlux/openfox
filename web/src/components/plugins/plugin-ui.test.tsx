/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PluginSlot } from './PluginSlot'
import { PluginBadges } from './PluginBadges'
import { PluginPanelHost } from './PluginPanelHost'
import { usePluginUiStore } from '../../stores/pluginUi'
import { useLocaleStore } from '../../stores/locale'
import { clearBadgeCache } from '../../lib/plugin-badge-cache'
import { EMPTY_PLUGIN_CONTRIBUTIONS } from '@shared/plugin.js'
import type { PluginUiContributions } from '@shared/plugin.js'

const contributionsRef: { current: PluginUiContributions } = {
  current: { actions: [], badges: [], panels: [], sections: [] },
}

vi.mock('../../hooks/usePlugins', () => ({
  usePlugins: () => ({
    plugins: [],
    contributions: contributionsRef.current,
    loading: false,
    error: undefined,
    refresh: vi.fn(),
  }),
}))

const invokePluginRpc = vi.fn()
vi.mock('../../lib/plugin-actions', () => ({
  invokePluginRpc: (...args: unknown[]) => invokePluginRpc(...args),
}))

describe('plugin UI slots', () => {
  beforeEach(() => {
    contributionsRef.current = { actions: [], badges: [], panels: [], sections: [] }
    invokePluginRpc.mockReset()
    usePluginUiStore.setState({ values: {}, activePanel: null })
    useLocaleStore.setState({ locale: 'en' })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders nothing for empty slots', () => {
    const { container } = render(<PluginSlot slot="header.actions" context={{}} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders an action and invokes its RPC with context', async () => {
    invokePluginRpc.mockResolvedValue('ok')
    contributionsRef.current = {
      ...contributionsRef.current,
      actions: [
        {
          id: 'refresh',
          pluginId: 'demo',
          slot: 'header.actions',
          label: { en: 'Refresh quota', fr: 'Actualiser le quota' },
          icon: 'refresh',
          onActivate: { kind: 'rpc', method: 'refresh', params: { force: true } },
        },
      ],
    }
    render(<PluginSlot slot="header.actions" context={{ sessionId: 's1', workdir: '/tmp' }} />)

    const button = screen.getByRole('button', { name: 'Refresh quota' })
    await userEvent.setup().click(button)

    await waitFor(() =>
      expect(invokePluginRpc).toHaveBeenCalledWith(
        'demo',
        'refresh',
        { force: true },
        {
          sessionId: 's1',
          workdir: '/tmp',
        },
      ),
    )
  })

  it('localizes action labels in French', () => {
    useLocaleStore.setState({ locale: 'fr' })
    contributionsRef.current = {
      ...contributionsRef.current,
      actions: [
        {
          id: 'refresh',
          pluginId: 'demo',
          slot: 'header.actions',
          label: { en: 'Refresh quota', fr: 'Actualiser le quota' },
          onActivate: { kind: 'rpc', method: 'refresh' },
        },
      ],
    }
    render(<PluginSlot slot="header.actions" context={{}} />)
    expect(screen.getByRole('button', { name: 'Actualiser le quota' })).toBeDefined()
  })

  it('opens a panel action through the plugin UI store', async () => {
    contributionsRef.current = {
      ...contributionsRef.current,
      actions: [
        {
          id: 'open',
          pluginId: 'demo',
          slot: 'header.actions',
          label: { en: 'Open quota', fr: 'Ouvrir le quota' },
          onActivate: { kind: 'openPanel', panelId: 'quota' },
        },
      ],
    }
    render(<PluginSlot slot="header.actions" context={{}} />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Open quota' }))
    expect(usePluginUiStore.getState().activePanel).toEqual({ pluginId: 'demo', panelId: 'quota' })
  })

  it('renders static and RPC-sourced badges', async () => {
    invokePluginRpc.mockResolvedValue(42)
    contributionsRef.current = {
      ...contributionsRef.current,
      badges: [
        {
          id: 'static',
          pluginId: 'demo',
          slot: 'session.row.badges',
          label: { en: 'Dev', fr: 'Dev' },
          tone: 'success',
          value: 'up',
        },
        {
          id: 'dynamic',
          pluginId: 'demo',
          slot: 'session.row.badges',
          label: { en: 'Quota', fr: 'Quota' },
          source: { kind: 'rpc', method: 'quota' },
        },
      ],
    }
    render(<PluginBadges slot="session.row.badges" context={{ sessionId: 's1' }} />)
    expect(screen.getByText('Dev up')).toBeDefined()
    await waitFor(() => expect(screen.getByText('Quota 42')).toBeDefined())
    expect(invokePluginRpc).toHaveBeenCalledWith('demo', 'quota', {}, { sessionId: 's1' })
  })

  it('dedupes badge RPCs across rows of the same session', async () => {
    clearBadgeCache()
    invokePluginRpc.mockResolvedValue(7)
    contributionsRef.current = {
      ...contributionsRef.current,
      badges: [
        {
          id: 'dynamic',
          pluginId: 'demo',
          slot: 'session.row.badges',
          label: { en: 'Quota', fr: 'Quota' },
          source: { kind: 'rpc', method: 'quota' },
        },
      ],
    }
    render(
      <>
        <PluginBadges slot="session.row.badges" context={{ sessionId: 's1' }} />
        <PluginBadges slot="session.row.badges" context={{ sessionId: 's1' }} />
      </>,
    )
    await waitFor(() => expect(screen.getAllByText('Quota 7')).toHaveLength(2))
    expect(invokePluginRpc).toHaveBeenCalledTimes(1)
  })

  it('renders an action for every documented action slot', () => {
    const slots = ['header.actions', 'session.header.actions', 'message.actions', 'composer.actions'] as const
    for (const slot of slots) {
      contributionsRef.current = {
        ...contributionsRef.current,
        actions: [
          {
            id: `action-${slot}`,
            pluginId: 'demo',
            slot,
            label: { en: `Label ${slot}`, fr: `Libellé ${slot}` },
            onActivate: { kind: 'rpc', method: 'ping' },
          },
        ],
      }
      const { container, unmount } = render(<PluginSlot slot={slot} context={{}} />)
      expect(container.textContent).toContain(`Label ${slot}`)
      unmount()
    }
  })

  it('renders a badge for every documented badge slot', () => {
    const slots = ['session.row.badges', 'session.header.badges'] as const
    for (const slot of slots) {
      contributionsRef.current = {
        ...contributionsRef.current,
        badges: [
          {
            id: `badge-${slot}`,
            pluginId: 'demo',
            slot,
            label: { en: `Badge ${slot}`, fr: `Badge ${slot}` },
          },
        ],
      }
      const { container, unmount } = render(<PluginBadges slot={slot} context={{}} />)
      expect(container.textContent).toContain(`Badge ${slot}`)
      unmount()
    }
  })

  it('filters actions and badges with visibleWhen', () => {
    contributionsRef.current = {
      ...contributionsRef.current,
      actions: [
        {
          id: 'needs-session',
          pluginId: 'demo',
          slot: 'header.actions',
          label: { en: 'Session only', fr: 'Session uniquement' },
          visibleWhen: { hasSession: true },
          onActivate: { kind: 'rpc', method: 'ping' },
        },
      ],
      badges: [
        {
          id: 'needs-message',
          pluginId: 'demo',
          slot: 'session.row.badges',
          label: { en: 'Message only', fr: 'Message uniquement' },
          visibleWhen: { hasMessage: true },
        },
      ],
    }

    const withoutSession = render(<PluginSlot slot="header.actions" context={{}} />)
    expect(withoutSession.container.innerHTML).toBe('')
    withoutSession.unmount()

    const withSession = render(<PluginSlot slot="header.actions" context={{ sessionId: 's1' }} />)
    expect(withSession.container.textContent).toContain('Session only')
    withSession.unmount()

    const withoutMessage = render(<PluginBadges slot="session.row.badges" context={{ sessionId: 's1' }} />)
    expect(withoutMessage.container.innerHTML).toBe('')
    withoutMessage.unmount()

    const withMessage = render(<PluginBadges slot="session.row.badges" context={{ messageId: 'm1' }} />)
    expect(withMessage.container.textContent).toContain('Message only')
  })

  it('opens a panel from a header action and renders it in the panel host', async () => {
    contributionsRef.current = {
      ...contributionsRef.current,
      actions: [
        {
          id: 'open-quota',
          pluginId: 'demo',
          slot: 'header.actions',
          label: { en: 'Open quota', fr: 'Ouvrir le quota' },
          onActivate: { kind: 'openPanel', panelId: 'quota' },
        },
      ],
      panels: [
        {
          id: 'quota',
          pluginId: 'demo',
          title: { en: 'Usage', fr: 'Utilisation' },
          kind: 'declarative',
          content: [{ type: 'text', text: { en: 'Live usage', fr: 'Utilisation en direct' } }],
        },
      ],
    }

    render(
      <>
        <PluginSlot slot="header.actions" context={{}} />
        <PluginPanelHost />
      </>,
    )
    expect(screen.queryByText('Usage')).toBeNull()

    await userEvent.setup().click(screen.getByRole('button', { name: 'Open quota' }))
    expect(screen.getByText('Usage')).toBeDefined()
    expect(screen.getByText('Live usage')).toBeDefined()
  })

  it('renders declarative panels with published values and closes on demand', async () => {
    contributionsRef.current = {
      ...contributionsRef.current,
      panels: [
        {
          id: 'quota',
          pluginId: 'demo',
          title: { en: 'Usage', fr: 'Utilisation' },
          kind: 'declarative',
          content: [
            { type: 'keyValue', items: [{ key: { en: 'Remaining', fr: 'Restant' }, value: '{{tokens}}' }] },
            { type: 'progress', label: { en: 'Budget', fr: 'Budget' }, value: 25, max: 100 },
            { type: 'divider' },
          ],
        },
      ],
    }
    usePluginUiStore.setState({ activePanel: { pluginId: 'demo', panelId: 'quota' }, values: {} })
    usePluginUiStore.getState().setState('demo', 'quota', 'tokens', 1234)

    render(<PluginPanelHost />)
    expect(screen.getByText('Usage')).toBeDefined()
    expect(screen.getByText('1234')).toBeDefined()
    expect(screen.getByText('25 / 100')).toBeDefined()
  })

  it('renders iframe panels sandboxed from the plugin asset route', () => {
    contributionsRef.current = {
      ...contributionsRef.current,
      panels: [
        {
          id: 'board',
          pluginId: 'demo',
          title: { en: 'Board', fr: 'Tableau' },
          kind: 'iframe',
          url: 'board.html',
        },
      ],
    }
    usePluginUiStore.setState({ activePanel: { pluginId: 'demo', panelId: 'board' }, values: {} })
    render(<PluginPanelHost />)
    const iframe = screen.getByTitle('Board')
    expect(iframe.getAttribute('src')).toBe('/api/plugins/demo/assets/board.html')
    expect(iframe.getAttribute('sandbox')).toBe('allow-scripts allow-forms')
  })
})

describe('EMPTY_PLUGIN_CONTRIBUTIONS', () => {
  it('is all zeros', () => {
    expect(Object.values(EMPTY_PLUGIN_CONTRIBUTIONS).every((value) => value === 0)).toBe(true)
  })
})
