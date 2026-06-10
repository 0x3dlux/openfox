import { useMemo } from 'react'
import { useProjectStore } from '../../stores/project'
import { DropdownMenu, type DropdownMenuItem } from '../shared/DropdownMenu'
import { ChevronDownIcon, CheckIcon, StarIcon, StarFilledIcon } from '../shared/icons'

interface ProjectDropdownProps {
  projects: Array<{ id: string; name: string; workdir: string; isStarred?: boolean }>
  currentProject: { id: string; name: string; workdir: string; isStarred?: boolean }
}

export function ProjectDropdown({ projects, currentProject }: ProjectDropdownProps) {
  const loadProject = useProjectStore((state) => state.loadProject)
  const toggleStar = useProjectStore((state) => state.toggleStar)

  const sortedProjects = useMemo(() => {
    const starred = projects.filter((p) => p.isStarred).sort((a, b) => a.name.localeCompare(b.name))
    const unstarred = projects.filter((p) => !p.isStarred).sort((a, b) => a.name.localeCompare(b.name))
    return [...starred, ...unstarred]
  }, [projects])

  const items: DropdownMenuItem[] = sortedProjects.map((proj) => ({
    label: (
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="truncate flex-1">{proj.name}</span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
            e.nativeEvent.stopImmediatePropagation()
            toggleStar(proj.id, !proj.isStarred)
          }}
          className="flex-shrink-0 p-1 hover:bg-bg-tertiary rounded transition-colors"
          title={proj.isStarred ? 'Unstar project' : 'Star project'}
        >
          {proj.isStarred ? (
            <StarFilledIcon className="w-3.5 h-3.5 text-yellow-500" />
          ) : (
            <StarIcon className="w-3.5 h-3.5 text-text-muted hover:text-yellow-500" />
          )}
        </button>
      </div>
    ),
    icon: proj.id === currentProject.id ? <CheckIcon /> : undefined,
    href: `/p/${proj.id}`,
    closeOnClick: true,
    onClick: () => {
      loadProject(proj.id)
    },
  }))

  return (
    <DropdownMenu
      items={items}
      trigger={
        <button
          className="text-text-secondary hover:text-text-primary hover:underline text-sm truncate flex items-center gap-1"
          title={currentProject.name}
        >
          {currentProject.name}
          <ChevronDownIcon />
        </button>
      }
      minWidth="250px"
    />
  )
}
