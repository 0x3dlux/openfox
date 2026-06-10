import type { WorkflowStep } from '../../../stores/workflows'
import type { AgentInfo } from '../../../stores/agents'
import { ArrowRightIcon } from '../../shared/icons'
import { CONDITION_TYPES } from './layout'

const inputClass =
  'w-full px-2 py-1.5 bg-bg-tertiary border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-accent-primary'
const selectClass =
  'w-full px-2 py-1.5 bg-bg-tertiary border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-accent-primary'
const labelClass = 'block text-[11px] text-text-secondary mb-0.5'

export function TransitionPanel({
  fromLabel,
  toLabel,
  condition,
  fromStep,
  agentTypes,
  onUpdateCondition,
  onDelete,
}: {
  fromLabel: string
  toLabel: string
  condition: { type: string; result?: string }
  fromStep?: WorkflowStep
  agentTypes: AgentInfo[]
  onUpdateCondition: (when: { type: string; result?: string }) => void
  onDelete: () => void
}) {
  const stepAgent =
    fromStep && (fromStep.type === 'sub_agent' || fromStep.type === 'agent')
      ? agentTypes.find((a) => a.id === (fromStep.type === 'sub_agent' ? fromStep.subAgentType : fromStep.toolMode))
      : undefined
  const hasResults = stepAgent?.results && stepAgent.results.length > 0

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/15 text-blue-300">Transition</span>
        <button onClick={onDelete} className="p-1 rounded text-text-muted hover:text-accent-error text-xs">
          Delete
        </button>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-text-secondary">
        <span className="font-medium text-text-primary">{fromLabel}</span>
        <ArrowRightIcon />
        <span className="font-medium text-text-primary">{toLabel}</span>
      </div>

      <div>
        <label className={labelClass}>Condition</label>
        <select
          value={condition.type}
          onChange={(e) => {
            onUpdateCondition(
              e.target.value === 'step_result' ? { type: 'step_result', result: 'success' } : { type: e.target.value },
            )
          }}
          className={selectClass}
        >
          {CONDITION_TYPES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {condition.type === 'step_result' && (
        <div>
          <label className={labelClass}>Result</label>
          {hasResults ? (
            <select
              value={condition.result ?? stepAgent!.results![0]}
              onChange={(e) => {
                onUpdateCondition({ type: 'step_result', result: e.target.value })
              }}
              className={selectClass}
            >
              {stepAgent!.results!.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={condition.result ?? 'success'}
              onChange={(e) => onUpdateCondition({ type: 'step_result', result: e.target.value })}
              placeholder="e.g. success, passed, failed"
              className={inputClass}
            />
          )}
        </div>
      )}

      <p className="text-text-muted text-[10px]">Drag handles to reconnect. Press Delete to remove.</p>
    </div>
  )
}
