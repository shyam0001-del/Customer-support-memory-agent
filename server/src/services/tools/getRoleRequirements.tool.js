import { placementIntelligenceService } from '../placement/placementIntelligence.service.js';

export const getRoleRequirementsTool = {
  name: 'get_role_requirements',
  description:
    'Retrieve structured skill requirements, categories, and importance levels for an engineering or analytics placement role from the official catalog.',
  parameters: {
    type: 'object',
    properties: {
      role: {
        type: 'string',
        description: 'The placement role name (e.g. "Software Engineer", "Backend Developer", "Data Analyst", "Data Scientist", "Machine Learning Engineer").',
      },
    },
    required: ['role'],
    additionalProperties: false,
  },

  validate(args) {
    if (!args || typeof args !== 'object') {
      throw new Error('Tool arguments must be an object.');
    }
    if (!args.role || typeof args.role !== 'string' || !args.role.trim()) {
      throw new Error('Invalid argument: "role" is required and must be a non-empty string.');
    }
  },

  async execute(args) {
    this.validate(args);
    const requirements = placementIntelligenceService.getRoleRequirements(args.role.trim());

    return {
      role: requirements.title,
      category: requirements.category,
      description: requirements.description,
      requiredSkills: requirements.skills.map((s) => ({
        name: s.name,
        importance: s.importance,
        category: s.category,
        minProficiency: s.minProficiency,
      })),
    };
  },
};
