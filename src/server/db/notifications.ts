import { getDatabase } from './index.js'
import type {
  LocalizedString,
  PluginNotification,
  PluginNotificationAction,
  PluginNotificationLevel,
} from '../../shared/plugin.js'

interface NotificationRow {
  id: string
  plugin_id: string
  title: string
  body: string | null
  level: string
  actions: string | null
  created_at: string
  read_at: string | null
}

function toNotification(row: NotificationRow): PluginNotification {
  return {
    id: row.id,
    pluginId: row.plugin_id,
    title: JSON.parse(row.title) as LocalizedString,
    ...(row.body ? { body: JSON.parse(row.body) as LocalizedString } : {}),
    level: row.level as PluginNotificationLevel,
    ...(row.actions ? { actions: JSON.parse(row.actions) as PluginNotificationAction[] } : {}),
    createdAt: row.created_at,
    ...(row.read_at ? { readAt: row.read_at } : {}),
  }
}

export function insertNotification(notification: PluginNotification): void {
  const db = getDatabase()
  db.prepare(
    `INSERT INTO notifications (id, plugin_id, title, body, level, actions, created_at, read_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    notification.id,
    notification.pluginId,
    JSON.stringify(notification.title),
    notification.body ? JSON.stringify(notification.body) : null,
    notification.level,
    notification.actions ? JSON.stringify(notification.actions) : null,
    notification.createdAt,
    notification.readAt ?? null,
  )
}

export function listNotifications(limit = 100): PluginNotification[] {
  const db = getDatabase()
  const rows = db
    .prepare(`SELECT * FROM notifications ORDER BY created_at DESC, rowid DESC LIMIT ?`)
    .all(limit) as NotificationRow[]
  return rows.map(toNotification)
}

export function markNotificationRead(id: string): void {
  const db = getDatabase()
  db.prepare(`UPDATE notifications SET read_at = ? WHERE id = ? AND read_at IS NULL`).run(new Date().toISOString(), id)
}

export function markAllNotificationsRead(): void {
  const db = getDatabase()
  db.prepare(`UPDATE notifications SET read_at = ? WHERE read_at IS NULL`).run(new Date().toISOString())
}

export function deleteNotification(id: string): void {
  getDatabase().prepare(`DELETE FROM notifications WHERE id = ?`).run(id)
}

export function clearNotifications(): void {
  getDatabase().prepare(`DELETE FROM notifications`).run()
}

export function countUnreadNotifications(): number {
  const row = getDatabase().prepare(`SELECT COUNT(*) AS count FROM notifications WHERE read_at IS NULL`).get() as {
    count: number
  }
  return row.count
}
