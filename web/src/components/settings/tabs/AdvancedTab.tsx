import { useEffect } from 'react'
import { useLocation } from 'wouter'
import { Button } from '../../shared/Button'
import { Toggle } from '../../shared/Toggle'
import { SETTINGS_KEYS } from '../../../stores/settings'
import { useSettingsStoreState } from '../useSettingsStore'

export function AdvancedTab({ onClose }: { onClose: () => void }) {
  const [, navigate] = useLocation()
  const { settings, loading, getSetting, setSetting } = useSettingsStoreState()

  const disableXmlProtection = settings[SETTINGS_KEYS.LLM_DISABLE_XML_PROTECTION] === 'true'
  const showOpenInEditor = settings[SETTINGS_KEYS.DISPLAY_SHOW_OPEN_IN_EDITOR] === 'true'
  const isLoading = loading[SETTINGS_KEYS.LLM_DISABLE_XML_PROTECTION] ?? false

  useEffect(() => {
    getSetting(SETTINGS_KEYS.LLM_DISABLE_XML_PROTECTION)
    getSetting(SETTINGS_KEYS.DISPLAY_SHOW_OPEN_IN_EDITOR)
  }, [getSetting])

  const handleToggleXmlProtection = async () => {
    const newValue = String(!disableXmlProtection)
    await setSetting(SETTINGS_KEYS.LLM_DISABLE_XML_PROTECTION, newValue)
  }

  const handleToggleOpenInEditor = async () => {
    const newValue = String(!showOpenInEditor)
    await setSetting(SETTINGS_KEYS.DISPLAY_SHOW_OPEN_IN_EDITOR, newValue)
  }

  function handleLaunchOnboarding() {
    onClose()
    navigate('/onboarding')
  }

  if (isLoading) {
    return <div className="text-sm text-text-muted">Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <div className="text-sm font-medium text-text-primary">Disable XML Tool Call Protection</div>
            <div className="text-xs text-text-muted mt-0.5">
              Allow the model to output XML tool call format instead of JSON function calls. Some third-party providers
              may require this.
            </div>
          </div>
          <Toggle enabled={disableXmlProtection} onClick={handleToggleXmlProtection} />
        </label>
      </div>
      <hr className="border-border" />
      <div>
        <h3 className="text-sm font-medium text-text-primary mb-3">Integrations</h3>
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <div className="text-sm text-text-primary">Show "Open in VSCode" links</div>
            <div className="text-xs text-text-muted mt-0.5">
              Display a link on file reads to open the file directly in VS Code.
            </div>
          </div>
          <Toggle enabled={showOpenInEditor} onClick={handleToggleOpenInEditor} />
        </label>
      </div>
      <hr className="border-border" />
      <div>
        <h3 className="text-sm font-medium text-text-primary mb-1">Onboarding</h3>
        <p className="text-sm text-text-muted mb-4">
          Reset your OpenFox setup and go through the initial configuration again.
        </p>
        <Button variant="secondary" onClick={handleLaunchOnboarding}>
          Launch Onboarding
        </Button>
      </div>
    </div>
  )
}
