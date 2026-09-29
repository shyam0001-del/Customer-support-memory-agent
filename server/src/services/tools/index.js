import { getUserProfileTool } from './getUserProfile.tool.js';
import { getUserProgressTool } from './getUserProgress.tool.js';
import { updateUserProgressTool } from './updateUserProgress.tool.js';
import { getRelevantMemoriesTool } from './getRelevantMemories.tool.js';
import { saveMemoryTool } from './saveMemory.tool.js';
import { updateMemoryTool } from './updateMemory.tool.js';
import { deleteMemoryTool } from './deleteMemory.tool.js';
import { getRoleRequirementsTool } from './getRoleRequirements.tool.js';
import { analyzePlacementReadinessTool } from './analyzePlacementReadiness.tool.js';
import { getSkillGapAnalysisTool } from './getSkillGapAnalysis.tool.js';
import { startPracticeSessionTool } from './startPracticeSession.tool.js';
import { submitPracticeAnswerTool } from './submitPracticeAnswer.tool.js';
import { getPracticeSessionTool } from './getPracticeSession.tool.js';
import { completePracticeSessionTool } from './completePracticeSession.tool.js';
import { getPracticeHistoryTool } from './getPracticeHistory.tool.js';
import { getWeakPracticeTopicsTool } from './getWeakPracticeTopics.tool.js';
import { searchKnowledgeTool } from './searchKnowledge.tool.js';
import { searchWebTool } from './searchWeb.tool.js';

class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this.register(getUserProfileTool);
    this.register(getUserProgressTool);
    this.register(updateUserProgressTool);
    this.register(getRelevantMemoriesTool);
    this.register(saveMemoryTool);
    this.register(updateMemoryTool);
    this.register(deleteMemoryTool);
    this.register(getRoleRequirementsTool);
    this.register(analyzePlacementReadinessTool);
    this.register(getSkillGapAnalysisTool);
    this.register(startPracticeSessionTool);
    this.register(submitPracticeAnswerTool);
    this.register(getPracticeSessionTool);
    this.register(completePracticeSessionTool);
    this.register(getPracticeHistoryTool);
    this.register(getWeakPracticeTopicsTool);
    this.register(searchKnowledgeTool);
    this.register(searchWebTool);
  }

  /**
   * Register a new tool definition
   */
  register(tool) {
    if (!tool || !tool.name || typeof tool.execute !== 'function') {
      throw new Error('Invalid tool: tool must have a name and an execute function.');
    }
    this.tools.set(tool.name, tool);
  }

  /**
   * Retrieve a tool by name
   */
  getTool(name) {
    return this.tools.get(name) || null;
  }

  /**
   * Get all tool definitions formatted for OpenAI-compatible tools schema
   * @returns {Array<{type: 'function', function: {name: string, description: string, parameters: Object}}>}
   */
  getDefinitions() {
    const definitions = [];
    for (const tool of this.tools.values()) {
      definitions.push({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      });
    }
    return definitions;
  }

  /**
   * Safely execute a tool by name, catching errors and returning structured result (Section 6)
   * @param {string} name
   * @param {Object} args
   * @returns {Promise<{success: boolean, data?: any, error?: {code: string, message: string}}>}
   */
  async executeTool(name, args = {}) {
    const tool = this.getTool(name);
    if (!tool) {
      return {
        success: false,
        error: {
          code: 'TOOL_NOT_FOUND',
          message: `Tool "${name}" is not registered in the system. Available tools: ${Array.from(this.tools.keys()).join(', ')}`,
        },
      };
    }

    try {
      // Validate arguments before execution
      if (typeof tool.validate === 'function') {
        tool.validate(args);
      }

      const data = await tool.execute(args);
      return {
        success: true,
        data,
      };
    } catch (err) {
      console.warn(`[Tool Warning] Tool "${name}" execution failed:`, err.message);
      return {
        success: false,
        error: {
          code: 'TOOL_EXECUTION_ERROR',
          message: err.message || `Unable to execute tool "${name}".`,
        },
      };
    }
  }

  /**
   * List all registered tool names
   */
  listToolNames() {
    return Array.from(this.tools.keys());
  }
}

export const toolRegistry = new ToolRegistry();
