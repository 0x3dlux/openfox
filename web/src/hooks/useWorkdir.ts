import { useState, useEffect } from 'react'
import { authFetch } from '../lib/api'

export function useWorkdir(): string | null {
  const [workdir, setWorkdir] = useState<string | null>(null)

  useEffect(() => {
    authFetch('/api/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.workdir) setWorkdir(data.workdir)
      })
  }, [])

  return workdir
}
