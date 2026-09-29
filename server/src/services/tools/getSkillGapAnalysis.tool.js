import { placementIntelligenceService } from '../placement/placementIntelligence.service.js';

export const getSkillGapAnalysisTool = {
  name: 'get_skill_gap_analysis',
  description:
    'Identify and prioritize missing skills and developing focus areas for a candidate relative to a target role. Returns deterministic skill gaps ranked by urgency.',
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
      totalGapsCount: analysis.skillGaps.length,
      skillGaps: analysis.skillGaps.map((g) => ({
        priority: g.priority,
        skill: g.skill,
        category: g.category,
        importance: g.importance,
        status: g.status,
        currentLevel: g.currentLevel,
        targetLevel: g.targetLevel,
        reason: g.reason,
      })),
      actionableFocus: analysis.priorities.map((p) => p.skill),
    };
  },
};
