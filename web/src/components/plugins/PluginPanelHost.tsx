import { useMemo } from 'react'
import { Modal } from '../shared/SelfContainedModal'
import { usePlugins } from '../../hooks/usePlugins'
import { useLocalizedString } from '../../hooks/useLocalizedString'
import { usePluginUiStore } from '../../stores/pluginUi'
import { getSessionToken } from '../../lib/api'
import { activatePluginAction, badgeToneClasses, type PluginActionContext } from './plugin-ui-utils'
import type { DeclarativeNode, PluginUiPanel } from '@shared/plugin.js'

const PANEL_SIZES: Record<NonNullable<PluginUiPanel['size']>, 'sm' | 'md' | 'lg'> = {
  sm: 'sm',
  md: 'md',
  lg: 'lg',
}

const PROGRESS_COLORS: Record<string, string> = {
  neutral: 'bg-text-muted',
  info: 'bg-accent-primary',
  success: 'bg-accent-success',
  warning: 'bg-accent-warning',
  danger: 'bg-accent-error',
}

function interpolate(text: string, values: Record<string, unknown>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key: string) => (key in values ? String(values[key]) : match))
}

function PanelNode({
  node,
  values,
  context,
  localize,
}: {
  node: DeclarativeNode
  values: Record<string, unknown>
  context: PluginActionContext & { pluginId?: string }
  localize: (value: { en: string; fr: string }) => string
}) {
  switch (node.type) {
    case 'text':
      return (
        <p className={node.muted ? 'text-sm text-text-muted' : 'text-sm text-text-primary'}>
          {interpolate(localize(node.text), values)}
        </p>
      )
    case 'keyValue':
      return (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          {node.items.map((item, index) => (
            <div key={index} className="contents">
              <dt className="text-text-muted">{localize(item.key)}</dt>
              <dd className="text-text-primary">{interpolate(item.value, values)}</dd>
            </div>
          ))}
        </dl>
      )
    case 'table':
      return (
        <table className="w-full text-sm">
          <thead>
            <tr>
              {node.columns.map((column, index) => (
                <th key={index} className="text-left text-text-muted font-medium pb-1">
                  {localize(column)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {node.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="py-0.5 text-text-primary">
                    {interpolate(cell, values)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )
    case 'progress':
      return (
        <div>
          <div className="flex justify-between text-xs text-text-muted mb-1">
            <span>{localize(node.label)}</span>
            <span>
              {node.value} / {node.max}
            </span>
          </div>
          <div className="h-2 rounded bg-bg-tertiary overflow-hidden">
            <div
              className={`h-full ${PROGRESS_COLORS[node.tone ?? 'info'] ?? 'bg-accent-primary'}`}
              style={{ width: `${node.max > 0 ? Math.min(100, (node.value / node.max) * 100) : 0}%` }}
            />
          </div>
        </div>
      )
    case 'badge':
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${badgeToneClasses(
            node.tone,
          )}`}
        >
          {localize(node.label)}
        </span>
      )
    case 'button':
      return (
        <button
          type="button"
          onClick={() => void activatePluginAction(context.pluginId, node.onActivate, context)}
          className="px-3 py-1.5 rounded text-sm bg-bg-tertiary text-text-primary hover:bg-bg-primary transition-colors"
        >
          {localize(node.label)}
        </button>
      )
    case 'divider':
      return <hr className="border-border" />
  }
}

export function PluginPanelHost() {
  const { contributions } = usePlugins()
  const activePanel = usePluginUiStore((state) => state.activePanel)
  const closePanel = usePluginUiStore((state) => state.closePanel)
  const publishedValues = usePluginUiStore((state) => state.values)
  const localize = useLocalizedString()
  const token = getSessionToken()

  const panel = useMemo(
    () =>
      activePanel
        ? contributions.panels.find(
            (candidate) => candidate.pluginId === activePanel.pluginId && candidate.id === activePanel.panelId,
          )
        : undefined,
    [activePanel, contributions.panels],
  )

  if (!activePanel || !panel) return null

  const context: PluginActionContext & { pluginId: string } = { pluginId: activePanel.pluginId }
  const values: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(publishedValues)) {
    const prefix = `${activePanel.pluginId}:${activePanel.panelId}:`
    if (key.startsWith(prefix)) values[key.slice(prefix.length)] = value
  }

  const iframeUrl =
    panel.kind === 'iframe' && panel.url
      ? `/api/plugins/${encodeURIComponent(activePanel.pluginId)}/assets/${panel.url.replace(/^\//, '')}${
          token ? `?token=${encodeURIComponent(token)}` : ''
        }`
      : undefined

  const handleClose = () => {
    usePluginUiStore.getState().clearPanel(activePanel.pluginId, activePanel.panelId)
    closePanel()
  }

  return (
    <Modal isOpen onClose={handleClose} size={PANEL_SIZES[panel.size ?? 'md']} title={localize(panel.title)}>
      {iframeUrl ? (
        <iframe
          src={iframeUrl}
          sandbox="allow-scripts allow-forms"
          className="w-full h-[60vh] border border-border rounded bg-bg-primary"
          title={localize(panel.title)}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {(panel.content ?? []).map((node, index) => (
            <PanelNode key={index} node={node} values={values} context={context} localize={localize} />
          ))}
        </div>
      )}
    </Modal>
  )
}
