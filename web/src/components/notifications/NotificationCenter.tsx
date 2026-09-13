import { useT } from '../../hooks/useT'
import { useLocalizedString } from '../../hooks/useLocalizedString'
import { useNotifications } from '../../hooks/useNotifications'
import { NotificationActions } from './NotificationActions'
import { Modal } from '../shared/SelfContainedModal'
import { Button } from '../shared/Button'
import { TrashIcon } from '../shared/icons'
import { formatDateTime } from '../../lib/format-date'

export function NotificationCenter({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const t = useT()
  const localize = useLocalizedString()
  const { notifications, markAllRead, remove, clear } = useNotifications()

  if (!isOpen) return null

  return (
    <Modal
      isOpen
      onClose={onClose}
      size="md"
      title={t({ en: 'Notifications', fr: 'Notifications' })}
      footer={
        notifications.length > 0 ? (
          <div className="flex justify-between w-full">
            <Button variant="secondary" size="sm" onClick={() => void markAllRead()}>
              {t({ en: 'Mark all as read', fr: 'Tout marquer comme lu' })}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => void clear()}>
              {t({ en: 'Clear all', fr: 'Tout effacer' })}
            </Button>
          </div>
        ) : undefined
      }
    >
      {notifications.length === 0 ? (
        <p className="text-sm text-text-muted text-center py-6">
          {t({ en: 'No notifications yet', fr: 'Aucune notification pour le moment' })}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {notifications.map((notification) => (
            <li
              key={notification.id}
              className={`flex items-start justify-between gap-3 p-2 rounded border ${
                notification.readAt ? 'border-border' : 'border-accent-primary/40 bg-accent-primary/5'
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary">{localize(notification.title)}</p>
                {notification.body ? (
                  <p className="mt-0.5 text-xs text-text-secondary">{localize(notification.body)}</p>
                ) : null}
                {(notification.actions ?? []).length > 0 ? (
                  <NotificationActions pluginId={notification.pluginId} actions={notification.actions ?? []} />
                ) : null}
                <p className="mt-1 text-[10px] text-text-muted">
                  {notification.pluginId} · {formatDateTime(notification.createdAt)}
                </p>
              </div>
              <button
                type="button"
                aria-label={t({ en: 'Delete notification', fr: 'Supprimer la notification' })}
                onClick={() => void remove(notification.id)}
                className="text-text-muted hover:text-accent-error shrink-0"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
