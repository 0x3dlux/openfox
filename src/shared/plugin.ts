export type LocalizedString = { en: string; fr: string }

export type PluginCapability =
  | 'providers'
  | 'models'
  | 'settings'
  | 'tools'
  | 'commands'
  | 'skills'
  | 'ui'
  | 'hooks'
  | 'notifications'
  | 'workflows'
  | 'rpc'
  | 'assets'

export type PluginSlotName =
  | 'header.actions'
  | 'session.header.actions'
  | 'message.actions'
  | 'composer.actions'
  | 'session.row.badges'
  | 'session.header.badges'

export type PluginBadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

export type PluginActivation =
  | { kind: 'rpc'; method: string; params?: Record<string, unknown> }
  | { kind: 'openPanel'; panelId: string }
  | { kind: 'openUrl'; url: string }

/**
 * Declarative visibility for a contribution. Every field is ANDed; omitted
 * fields impose no constraint. Context values come from the slot host
 * (e.g. a session row passes sessionId, a message menu passes messageId).
 */
export interface PluginVisibilityCondition {
  hasSession?: boolean
  hasProject?: boolean
  hasMessage?: boolean
}

export interface PluginUiAction {
  id: string
  pluginId?: string
  slot: 'header.actions' | 'session.header.actions' | 'message.actions' | 'composer.actions'
  label: LocalizedString
  icon?: string
  variant?: 'default' | 'primary' | 'danger'
  tooltip?: LocalizedString
  visibleWhen?: PluginVisibilityCondition
  onActivate: PluginActivation
}

export interface PluginUiBadge {
  id: string
  pluginId?: string
  slot: 'session.row.badges' | 'session.header.badges'
  label: LocalizedString
  tone?: PluginBadgeTone
  tooltip?: LocalizedString
  value?: string
  visibleWhen?: PluginVisibilityCondition
  source?: { kind: 'rpc'; method: string }
}

export type DeclarativeNode =
  | { type: 'text'; text: LocalizedString; muted?: boolean }
  | { type: 'keyValue'; items: { key: LocalizedString; value: string }[] }
  | { type: 'table'; columns: LocalizedString[]; rows: string[][] }
  | { type: 'progress'; label: LocalizedString; value: number; max: number; tone?: PluginBadgeTone }
  | { type: 'badge'; label: LocalizedString; tone?: PluginBadgeTone }
  | { type: 'button'; label: LocalizedString; variant?: 'default' | 'primary' | 'danger'; onActivate: PluginActivation }
  | { type: 'divider' }

export interface PluginUiPanel {
  id: string
  pluginId?: string
  title: LocalizedString
  size?: 'sm' | 'md' | 'lg'
  kind: 'declarative' | 'iframe'
  content?: DeclarativeNode[]
  url?: string
}

export interface PluginUiContributions {
  actions: PluginUiAction[]
  badges: PluginUiBadge[]
  panels: PluginUiPanel[]
  sections: PluginUiSection[]
}

export interface PluginUiSection {
  id: string
  pluginId: string
  title: LocalizedString
  schema: PluginSettingsSchema
}

export interface PluginUiStatePayload {
  pluginId: string
  panelId?: string
  key: string
  value: unknown
}

export type PluginSettingScope = 'global' | 'project'

export type PluginSettingValue = string | number | boolean

export interface PluginSettingsOption {
  value: string
  label: LocalizedString
}

export interface PluginSettingsField {
  key: string
  type: 'text' | 'password' | 'number' | 'boolean' | 'select' | 'textarea' | 'path'
  label: LocalizedString
  description?: LocalizedString
  default?: PluginSettingValue
  options?: PluginSettingsOption[]
  required?: boolean
  secret?: boolean
  placeholder?: string
  scope?: PluginSettingScope
}

export interface PluginSettingsSchema {
  fields: PluginSettingsField[]
}

export type PluginSettingsValues = Record<string, PluginSettingValue>

export interface PluginModelPricingView {
  input?: number
  output?: number
  cacheRead?: number
  cacheWrite?: number
  currency?: string
  discountPercent?: number
}

export interface PluginModelMetadataView {
  pricing?: PluginModelPricingView
  contextWindow?: number
  vision?: boolean
  reasoning?: boolean
  badges?: { label: LocalizedString; tone?: PluginBadgeTone }[]
}

export interface PluginContributionSummary {
  presets: number
  authAdapters: number
  transportAdapters: number
  modelMetadataProviders: number
  tools: number
  commands: number
  skillSources: number
  hooks: number
  rpcMethods: number
  transitions: number
  settingsFields: number
  uiActions: number
  uiBadges: number
  uiPanels: number
}

export interface PluginInfo {
  id: string
  displayName: string
  description?: string
  version: string
  apiVersion: 1 | 2
  source: string
  enabled: boolean
  loaded: boolean
  error?: string
  capabilities: PluginCapability[]
  contributions: PluginContributionSummary
  /** False when the plugin was discovered outside {configDir}/plugins (e.g. node_modules). */
  removable: boolean
}

export type PluginNotificationLevel = 'info' | 'success' | 'warning' | 'error'

export interface PluginNotificationAction {
  label: LocalizedString
  onActivate: PluginActivation
}

export interface PluginNotification {
  id: string
  pluginId: string
  title: LocalizedString
  body?: LocalizedString
  level: PluginNotificationLevel
  actions?: PluginNotificationAction[]
  createdAt: string
  readAt?: string
}

export interface PluginNotificationPayload {
  notification: PluginNotification
}

export interface PluginNotificationDeletedPayload {
  id?: string
  all?: boolean
}

export const EMPTY_PLUGIN_CONTRIBUTIONS: PluginContributionSummary = {
  presets: 0,
  authAdapters: 0,
  transportAdapters: 0,
  modelMetadataProviders: 0,
  tools: 0,
  commands: 0,
  skillSources: 0,
  hooks: 0,
  rpcMethods: 0,
  transitions: 0,
  settingsFields: 0,
  uiActions: 0,
  uiBadges: 0,
  uiPanels: 0,
}
