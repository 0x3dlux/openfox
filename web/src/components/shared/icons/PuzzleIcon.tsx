import { IconBase } from './IconBase'

export function PuzzleIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 4a2 2 0 1 1 4 0v1h3a1 1 0 0 1 1 1v3h1a2 2 0 1 1 0 4h-1v3a1 1 0 0 1-1 1h-3v-1a2 2 0 1 0-4 0v1H7a1 1 0 0 1-1-1v-3H5a2 2 0 1 1 0-4h1V6a1 1 0 0 1 1-1h3V4Z"
      />
    </IconBase>
  )
}
