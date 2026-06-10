interface StepIndicatorProps {
  currentStep: number
  totalSteps: number
  labels: string[]
  onStepClick?: (step: number) => void
}

export function StepIndicator({ currentStep, totalSteps, labels, onStepClick }: StepIndicatorProps) {
  return (
    <div className="flex justify-center py-6">
      <div className="flex items-center">
        {Array.from({ length: totalSteps }, (_, i) => {
          const stepNum = i + 1
          const isCompleted = stepNum < currentStep
          const isCurrent = stepNum === currentStep

          return (
            <div key={i} className="flex items-center">
              <button
                onClick={() => onStepClick?.(stepNum)}
                className={`size-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors shrink-0 ${
                  isCompleted
                    ? 'bg-accent-primary text-text-primary hover:opacity-80'
                    : isCurrent
                      ? 'bg-accent-primary text-text-primary'
                      : 'bg-bg-tertiary text-text-muted'
                }`}
              >
                {isCompleted ? '✓' : stepNum}
              </button>
              <button
                onClick={() => onStepClick?.(stepNum)}
                className={`ml-2 mr-4 text-sm whitespace-nowrap hidden sm:block ${isCurrent ? 'text-text-primary font-medium' : 'text-text-muted hover:text-text-secondary'}`}
              >
                {labels[i]}
              </button>
              {i < totalSteps - 1 && (
                <div className={`w-12 sm:w-20 h-0.5 mr-4 ${isCompleted ? 'bg-accent-primary' : 'bg-border'}`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
