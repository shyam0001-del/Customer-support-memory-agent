import { userService } from '../user/user.service.js';

export const getUserProfileTool = {
  name: 'get_user_profile',
  description:
    "Retrieve the candidate's academic and career profile information, including degree, current skills with proficiency levels, target role, target companies, and LeetCode problem count.",
  parameters: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        description: 'The unique ID of the candidate profile to retrieve.',
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
    const user = await userService.getUserById(args.userId.trim());
    if (!user) {
      throw new Error(`Candidate with userId "${args.userId}" was not found.`);
    }

    return {
      userId: user.id,
      name: user.name,
      degree: user.degree || 'Not specified',
      specialization: user.specialization || 'Not specified',
      experienceLevel: user.experienceLevel || 'Student',
      targetRole: user.targetRole || 'Not specified',
      targetCompanies: user.targetCompanies || [],
      skills: user.skills || [],
      leetcodeSolved: user.leetcodeSolved || 0,
      weakAreas: user.weakAreas || [],
    };
  },
};
