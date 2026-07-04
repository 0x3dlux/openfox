import { useEffect } from 'react'
import { useRoute } from 'wouter'
import { useSessionStore } from '../stores/session'
import { useNotificationSettingsStore } from '../stores/notifications'

export function useWebSocket() {
  const connect = useSessionStore((state) => state.connect)
  const connectionStatus = useSessionStore((state) => state.connectionStatus)
  const loadNotificationSettings = useNotificationSettingsStore((state) => state.load)
  const isReadonly = useRoute('/p/:projectId/s/:sessionId/readonly')[0]

  useEffect(() => {
    if (isReadonly) return
    connect()
  }, [connect, isReadonly])

  useEffect(() => {
    if (isReadonly) return
    if (connectionStatus === 'connected') {
      loadNotificationSettings()
    }
  }, [connectionStatus, loadNotificationSettings, isReadonly])

  return { connectionStatus }
}
