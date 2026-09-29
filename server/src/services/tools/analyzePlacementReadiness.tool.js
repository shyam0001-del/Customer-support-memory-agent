import { placementIntelligenceService } from '../placement/placementIntelligence.service.js';

export const analyzePlacementReadinessTool = {
  name: 'analyze_placement_readiness',
  description:
    'Perform a comprehensive placement readiness assessment for a candidate against a target placement role. Analyzes skill coverage, gap severity, priority areas, and overall readiness indicator.',
  parameters: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        description: 'The unique ID of the candidate.',
      },
      role: {
        type: 'string',
        description: 'Optional target role override. If omitted, uses the candidate profile targetRole.',
      },
    },
    required: ['userId'],
    additionalProperties: false,
  },

  validate(args) {
    if (!args || typeof args !== 'object') {
      throw new Error('Tool arguments must be an object.');
    }
    if (!args.userId || typeof args.userId !== 'string' || !args.userId.trim()) {
      throw new Error('Invalid argument: "userId" is required and must be a non-empty string.');
    }
  },

  async execute(args) {
    this.validate(args);
    const analysis = await placementIntelligenceService.generatePlacementAnalysis({
      userId: args.userId.trim(),
      role: args.role && typeof args.role === 'string' ? args.role.trim() : null,
    });

    return {
      targetRole: analysis.role,
      category: analysis.category,
      readiness: analysis.readiness,
      strengths: analysis.strengths.map((s) => s.skill),
      priorityGaps: analysis.priorities.map((g) => ({
        priority: g.priority,
        skill: g.skill,
        importance: g.importance,
        status: g.status,
        reason: g.reason,
      })),
      recommendations: analysis.recommendations,
    };
  },
};
