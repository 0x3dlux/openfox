import { Button } from './Button'

export interface ModalSaveCancelFooterProps {
  onCancel: () => void
  onSave: () => void
  saving: boolean
  disabled: boolean
  compact?: boolean
}

export function ModalSaveCancelFooter({ onCancel, onSave, saving, disabled, compact }: ModalSaveCancelFooterProps) {
  return (
    <div className={`flex justify-end gap-2 ${compact ? 'pt-3 mt-3' : 'pt-2'} border-t border-border flex-shrink-0`}>
      <Button variant="secondary" onClick={onCancel}>
        Cancel
      </Button>
      <Button variant="primary" onClick={onSave} disabled={disabled}>
        {saving ? 'Saving...' : 'Save'}
      </Button>
    </div>
  )
}
