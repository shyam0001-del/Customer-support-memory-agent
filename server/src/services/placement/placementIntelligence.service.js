import { ROLE_CATALOG, ROLE_ALIASES, SKILL_ALIASES } from '../../config/roles.catalog.js';
import { userService } from '../user/user.service.js';
import { memoryService } from '../memory/memory.service.js';

export const READINESS_LEVELS = {
  EARLY: 'early',
  DEVELOPING: 'developing',
  PROGRESSING: 'progressing',
  PLACEMENT_READY: 'placement_ready',
};

const PROFICIENCY_SCORES = {
  beginner: 0.4,
  intermediate: 0.8,
  advanced: 1.0,
  expert: 1.0,
};

const IMPORTANCE_WEIGHTS = {
  high: 3,
  medium: 2,
  low: 1,
};

export class PlacementIntelligenceService {
  /**
   * List all available roles in the catalog
   */
  getAvailableRoles() {
    return Object.values(ROLE_CATALOG).map((r) => ({
      title: r.title,
      category: r.category,
      description: r.description,
      requiredSkillCount: r.skills.length,
    }));
  }

  /**
   * Normalize a role name using aliases and catalog matching
   * @param {string} roleName
   * @returns {string|null}
   */
  normalizeRole(roleName) {
    if (!roleName || typeof roleName !== 'string') return null;
    const clean = roleName.trim().toLowerCase();
    if (ROLE_ALIASES[clean]) {
      return ROLE_ALIASES[clean];
    }
    // Exact case-insensitive match against catalog titles
    for (const [key, value] of Object.entries(ROLE_CATALOG)) {
      if (key.toLowerCase() === clean) {
        return value.title;
      }
    }

    const words = new Set(clean.split(/[^a-z0-9]+/).filter(Boolean));

    // Word-based heuristics for flexible target role matching
    if (words.has('backend') || words.has('node')) {
      return 'Backend Developer';
    }
    if (words.has('frontend') || words.has('react') || words.has('ui')) {
      return 'Frontend Developer';
    }
    if (words.has('fullstack') || (words.has('full') && words.has('stack'))) {
      return 'Full Stack Developer';
    }
    if (words.has('analyst') || words.has('analytics') || words.has('da') || words.has('bi')) {
      return 'Data Analyst';
    }
    if (words.has('scientist') || words.has('ds')) {
      return 'Data Scientist';
    }
    if (words.has('ml') || words.has('mle') || clean.includes('machine learning')) {
      return 'Machine Learning Engineer';
    }
    if (words.has('ai') || clean.includes('artificial intelligence')) {
      return 'AI Engineer';
    }
    if ((words.has('data') && words.has('engineer')) || words.has('etl') || words.has('spark') || words.has('de')) {
      return 'Data Engineer';
    }
    if (words.has('software') || words.has('sde') || words.has('swe')) {
      return 'Software Engineer';
    }

    return null;
  }

  /**
   * Retrieve structured requirements for a role
   * @param {string} role
   * @returns {Object}
   */
  getRoleRequirements(role) {
    if (!role || typeof role !== 'string') {
      throw new Error('Role name is required and must be a string.');
    }

    const canonicalRole = this.normalizeRole(role);
    if (!canonicalRole || !ROLE_CATALOG[canonicalRole]) {
      throw new Error(`Role "${role}" not found in catalog. Available roles: ${Object.keys(ROLE_CATALOG).join(', ')}`);
    }

    return ROLE_CATALOG[canonicalRole];
  }

  /**
   * Normalize a skill name using alias mappings
   * @param {string} skill
   * @returns {string}
   */
  normalizeSkill(skill) {
    if (!skill || typeof skill !== 'string') return '';
    const clean = skill
      .toLowerCase()
      .trim()
      .replace(/[^\w\s+#/.&-]/g, '');

    return SKILL_ALIASES[clean] || clean;
  }

  /**
   * Compare candidate skills, progress, and weak areas against role requirements
   * @param {Object} candidate
   * @param {Object} roleRequirements
   * @param {Array<Object>} [relevantMemories]
   * @returns {Object}
   */
  compareCandidateSkills(candidate, roleRequirements, relevantMemories = []) {
    const candidateSkills = Array.isArray(candidate?.skills) ? candidate.skills : [];
    const candidateWeakAreas = Array.isArray(candidate?.weakAreas) ? candidate.weakAreas : [];
    const candidateProgress = Array.isArray(candidate?.progress) ? candidate.progress : [];

    // Map candidate skills by normalized name
    const skillMap = new Map();
    for (const item of candidateSkills) {
      if (!item || !item.name) continue;
      const normalized = this.normalizeSkill(item.name);
      skillMap.set(normalized, {
        originalName: item.name,
        level: (item.level || 'intermediate').toLowerCase(),
        score: PROFICIENCY_SCORES[(item.level || 'intermediate').toLowerCase()] || 0.6,
      });
    }

    // Normalized sets of weak areas and progress
    const weakSet = new Set(candidateWeakAreas.map((w) => this.normalizeSkill(w)));
    const memoryWeakSet = new Set(
      relevantMemories
        .filter((m) => m.type === 'weakness')
        .map((m) => this.normalizeSkill(m.key))
    );

    const progressCompletedSet = new Set();
    const progressWeakSet = new Set();
    for (const p of candidateProgress) {
      const normTopic = this.normalizeSkill(p.topic);
      if (p.status === 'completed') progressCompletedSet.add(normTopic);
      if (p.status === 'weak') progressWeakSet.add(normTopic);
    }

    const strengths = [];
    const gaps = [];
    const developing = [];

    for (const req of roleRequirements.skills) {
      const normReq = this.normalizeSkill(req.name);
      const candidateHas = skillMap.get(normReq);
      const isWeak = weakSet.has(normReq) || memoryWeakSet.has(normReq) || progressWeakSet.has(normReq);
      const isCompletedProgress = progressCompletedSet.has(normReq);

      const targetScore = PROFICIENCY_SCORES[req.minProficiency || 'intermediate'] || 0.8;

      if (!candidateHas) {
        // Complete skill gap
        gaps.push({
          skill: req.name,
          normalizedName: normReq,
          category: req.category,
          importance: req.importance,
          status: 'gap',
          currentLevel: 'not_started',
          targetLevel: req.minProficiency || 'intermediate',
          isWeakArea: isWeak,
          reason: `Required for ${roleRequirements.title} but not listed in profile skills.`,
        });
      } else if (isWeak || (candidateHas.score < targetScore && !isCompletedProgress)) {
        // Developing skill (present but below proficiency or marked as weak)
        developing.push({
          skill: req.name,
          normalizedName: normReq,
          category: req.category,
          importance: req.importance,
          status: 'developing',
          currentLevel: candidateHas.level,
          targetLevel: req.minProficiency || 'intermediate',
          isWeakArea: isWeak,
          reason: isWeak
            ? `Flagged as a focus/weak area requiring reinforced practice.`
            : `Proficiency is currently ${candidateHas.level}; target is ${req.minProficiency || 'intermediate'}.`,
        });
      } else {
        // Strong matched skill
        strengths.push({
          skill: req.name,
          category: req.category,
          importance: req.importance,
          level: candidateHas.level,
          status: 'strong',
        });
      }
    }

    return { strengths, developing, gaps };
  }

  /**
   * Prioritize skill gaps based on requirement importance, gap severity, and weak area flags
   * @param {Array<Object>} skillGaps
   * @returns {Array<Object>}
   */
  prioritizeSkillGaps(skillGaps) {
    const scoredGaps = skillGaps.map((item) => {
      let weight = IMPORTANCE_WEIGHTS[item.importance] || 1;
      // Critical gap (completely missing) gets a bump over developing
      if (item.status === 'gap') weight += 0.5;
      // Weak area explicitly acknowledged by student gets priority focus
      if (item.isWeakArea) weight += 0.75;

      return {
        ...item,
        priorityScore: weight,
      };
    });

    // Sort descending by priority score
    scoredGaps.sort((a, b) => b.priorityScore - a.priorityScore);

    return scoredGaps.map((item, idx) => ({
      priority: idx + 1,
      skill: item.skill,
      category: item.category,
      importance: item.importance,
      status: item.status,
      currentLevel: item.currentLevel,
      targetLevel: item.targetLevel,
      reason: item.reason,
    }));
  }

  /**
   * Compute an explainable, transparent placement readiness score and category
   * @param {Object} candidate
   * @param {Object} roleRequirements
   * @param {Object} comparison
   * @returns {Object}
   */
  calculateReadiness(candidate, roleRequirements, comparison) {
    let totalWeight = 0;
    let earnedWeight = 0;

    for (const req of roleRequirements.skills) {
      const w = IMPORTANCE_WEIGHTS[req.importance] || 2;
      totalWeight += w;

      const norm = this.normalizeSkill(req.name);
      const isStrong = comparison.strengths.some((s) => this.normalizeSkill(s.skill) === norm);
      const isDeveloping = comparison.developing.some((d) => this.normalizeSkill(d.skill) === norm);

      if (isStrong) {
        earnedWeight += w * 1.0;
      } else if (isDeveloping) {
        earnedWeight += w * 0.5;
      } else {
        earnedWeight += 0;
      }
    }

    let baseScore = totalWeight > 0 ? earnedWeight / totalWeight : 0;

    // Bonus for completed preparation progress topics
    const completedProgress = Array.isArray(candidate?.progress)
      ? candidate.progress.filter((p) => p.status === 'completed').length
      : 0;
    const progressBonus = Math.min(completedProgress * 0.02, 0.08); // max +8%

    // Bonus for coding practice (LeetCode solved)
    const leetcodeSolved = Number(candidate?.leetcodeSolved) || 0;
    let leetcodeBonus = 0;
    if (leetcodeSolved >= 200) leetcodeBonus = 0.05;
    else if (leetcodeSolved >= 100) leetcodeBonus = 0.03;
    else if (leetcodeSolved >= 50) leetcodeBonus = 0.015;

    const finalScore = Math.min(1.0, Math.max(0.0, Number((baseScore + progressBonus + leetcodeBonus).toFixed(2))));

    let level;
    if (finalScore >= 0.80) {
      level = READINESS_LEVELS.PLACEMENT_READY;
    } else if (finalScore >= 0.60) {
      level = READINESS_LEVELS.PROGRESSING;
    } else if (finalScore >= 0.35) {
      level = READINESS_LEVELS.DEVELOPING;
    } else {
      level = READINESS_LEVELS.EARLY;
    }

    return {
      score: finalScore,
      level,
      breakdown: {
        skillsMatchScore: Number(baseScore.toFixed(2)),
        progressBonus: Number(progressBonus.toFixed(2)),
        codingPracticeBonus: Number(leetcodeBonus.toFixed(2)),
      },
    };
  }

  /**
   * Generate actionable, targeted recommendations based on top priority gaps
   * @param {Array<Object>} prioritizedGaps
   * @param {Object} roleRequirements
   * @returns {Array<string>}
   */
  generateRecommendations(prioritizedGaps, roleRequirements) {
    if (!prioritizedGaps || prioritizedGaps.length === 0) {
      return [
        `Candidate demonstrates strong coverage for ${roleRequirements.title}. Maintain momentum with mock technical interviews and full-stack project walkthroughs.`,
      ];
    }

    const recs = [];
    const topGaps = prioritizedGaps.slice(0, 3);

    for (const gap of topGaps) {
      if (gap.status === 'gap') {
        recs.push(`Prioritize building foundational competency in ${gap.skill} (${gap.importance} importance) through structured drills and mini-projects.`);
      } else {
        recs.push(`Elevate ${gap.skill} from ${gap.currentLevel} to ${gap.targetLevel} by targeting advanced problem sets and resolving key weak areas.`);
      }
    }

    return recs;
  }

  /**
   * Comprehensive end-to-end placement intelligence analysis for a candidate
   * @param {Object} params
   * @param {string} [params.userId]
   * @param {Object} [params.candidateProfile]
   * @param {string} [params.role]
   * @returns {Promise<Object>}
   */
  async generatePlacementAnalysis({ userId, candidateProfile = null, role = null }) {
    let candidate = candidateProfile;

    if (!candidate && userId) {
      candidate = await userService.getUserById(userId);
    }

    if (!candidate) {
      throw new Error('Candidate profile not found or userId is invalid.');
    }

    let requirements;
    if (role && typeof role === 'string' && role.trim()) {
      requirements = this.getRoleRequirements(role.trim());
    } else {
      const canonicalRole = this.normalizeRole(candidate.targetRole) || 'Software Engineer';
      requirements = this.getRoleRequirements(canonicalRole);
    }

    // Retrieve relevant candidate memories matching role requirements or candidate weaknesses
    let relevantMemories = [];
    if (userId) {
      try {
        const userMemories = await memoryService.getMemoriesByUser(userId);
        const reqSkillNames = new Set(requirements.skills.map((s) => this.normalizeSkill(s.name)));
        relevantMemories = userMemories.filter((m) => {
          const normKey = this.normalizeSkill(m.key);
          return reqSkillNames.has(normKey) || m.type === 'weakness' || m.type === 'goal';
        });
      } catch {
        relevantMemories = [];
      }
    }

    const comparison = this.compareCandidateSkills(candidate, requirements, relevantMemories);
    const combinedGaps = [...comparison.gaps, ...comparison.developing];
    const priorities = this.prioritizeSkillGaps(combinedGaps);
    const readiness = this.calculateReadiness(candidate, requirements, comparison);
    const recommendations = this.generateRecommendations(priorities, requirements);

    return {
      role: requirements.title,
      category: requirements.category,
      candidateId: candidate.id || candidate._id || userId || 'unknown',
      candidateName: candidate.name || 'Candidate',
      readiness,
      strengths: comparison.strengths,
      skillGaps: priorities,
      priorities: priorities.slice(0, 5),
      recommendations,
      timestamp: new Date().toISOString(),
    };
  }
}

export const placementIntelligenceService = new PlacementIntelligenceService();
