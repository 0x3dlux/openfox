import { useState } from 'react'
import { useT } from '../../hooks/useT'
import { useNotifications } from '../../hooks/useNotifications'
import { BellIcon } from '../shared/icons'
import { NotificationCenter } from './NotificationCenter'

export function NotificationBell() {
  const t = useT()
  const { unreadCount } = useNotifications()
  const [open, setOpen] = useState(false)
  const label = t({ en: 'Notifications', fr: 'Notifications' })

  return (
    <>
      <button
        type="button"
        title={label}
        aria-label={label}
        onClick={() => setOpen(true)}
        className="relative p-2 rounded text-text-secondary hover:text-text-primary hover:bg-bg-primary transition-colors"
      >
        <BellIcon className="w-5 h-5" />
        {unreadCount > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-accent-success text-white text-[10px] leading-4 text-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>
      <NotificationCenter isOpen={open} onClose={() => setOpen(false)} />
    </>
  )
}
