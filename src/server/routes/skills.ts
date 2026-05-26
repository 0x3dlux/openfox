import {
  loadDefaultSkills,
  loadUserSkills,
  loadProjectSkills,
  loadAllSkills,
  isSkillEnabled,
  findSkillById,
  saveSkill,
  saveSkillToProject,
  deleteSkill,
  deleteProjectSkill,
  skillExists,
  isDefaultSkill,
  getDefaultSkillIds,
} from '../skills/registry.js'
import type { SkillDefinition } from '../skills/types.js'
import { createCrudRoutes, validateNameIdPrompt, type CrudRouteConfig } from './crud-helpers.js'

const config: CrudRouteConfig<SkillDefinition> = {
  dirName: 'skills',
  ext: '.skill.md',
  loadDefaults: loadDefaultSkills,
  loadUser: loadUserSkills,
  loadProject: loadProjectSkills,
  loadAll: loadAllSkills,
  findById: findSkillById,
  save: saveSkill,
  saveToProject: saveSkillToProject,
  delete: deleteSkill,
  deleteProject: deleteProjectSkill,
  exists: skillExists,
  isDefault: isDefaultSkill,
  getDefaultIds: getDefaultSkillIds,
  validateCreate: validateNameIdPrompt,
  mapToResponse: (s) => ({
    ...s.metadata,
    enabled: isSkillEnabled(s.metadata.id),
  }),
}

export function createSkillRoutes(configDir: string, projectDir?: string) {
  return createCrudRoutes<SkillDefinition>(config, configDir, projectDir)
}
