import {
  loadDefaultAgents,
  loadUserAgents,
  loadProjectAgents,
  loadAllAgents,
  findAgentById,
  saveAgent,
  saveAgentToProject,
  deleteAgent,
  deleteProjectAgent,
  agentExists,
  isDefaultAgent,
  getDefaultAgentIds,
} from '../agents/registry.js'
import type { AgentDefinition } from '../agents/types.js'
import { createCrudRoutes, type CrudRouteConfig } from './crud-helpers.js'

const config: CrudRouteConfig<AgentDefinition> = {
  dirName: 'agents',
  ext: '.agent.md',
  loadDefaults: loadDefaultAgents,
  loadUser: loadUserAgents,
  loadProject: loadProjectAgents,
  loadAll: loadAllAgents,
  findById: findAgentById,
  save: saveAgent,
  saveToProject: saveAgentToProject,
  delete: deleteAgent,
  deleteProject: deleteProjectAgent,
  exists: agentExists,
  isDefault: isDefaultAgent,
  getDefaultIds: getDefaultAgentIds,
  validateCreate: (body) => {
    const meta = body['metadata'] as Record<string, unknown> | undefined
    if (!meta?.['id'] || !body['prompt']) return 'Missing required fields: metadata.id, prompt'
    return null
  },
  mapToResponse: (a) => a.metadata as unknown as { [key: string]: unknown },
}

export function createAgentRoutes(configDir: string, projectDir?: string) {
  return createCrudRoutes<AgentDefinition>(config, configDir, projectDir)
}
