import { userService } from '../services/user/user.service.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

/**
 * POST /api/users
 * Create a new user profile
 */
export async function createUserHandler(req, res, next) {
  try {
    const {
      name,
      email,
      degree,
      specialization,
      skills,
      targetRole,
      targetCompanies,
      experienceLevel,
      leetcodeSolved,
      weakAreas,
    } = req.body || {};

    // Validate required fields
    if (!name || typeof name !== 'string' || !name.trim()) {
      return errorResponse(res, 'Name is required and must be a non-empty string.', 400, 'VALIDATION_ERROR');
    }

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return errorResponse(res, 'A valid email address is required.', 400, 'VALIDATION_ERROR');
    }

    // Sanitize skills array if provided
    let sanitizedSkills = [];
    if (Array.isArray(skills)) {
      sanitizedSkills = skills
        .filter((s) => s && typeof s.name === 'string' && s.name.trim())
        .map((s) => ({
          name: s.name.trim(),
          level: ['beginner', 'intermediate', 'advanced', 'expert'].includes(s.level?.toLowerCase())
            ? s.level.toLowerCase()
            : 'intermediate',
        }));
    }

    const userData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      degree: typeof degree === 'string' ? degree.trim() : '',
      specialization: typeof specialization === 'string' ? specialization.trim() : '',
      skills: sanitizedSkills,
      targetRole: typeof targetRole === 'string' ? targetRole.trim() : '',
      targetCompanies: Array.isArray(targetCompanies)
        ? targetCompanies.filter((c) => typeof c === 'string' && c.trim()).map((c) => c.trim())
        : [],
      experienceLevel: typeof experienceLevel === 'string' ? experienceLevel.trim() : 'Student',
      leetcodeSolved: typeof leetcodeSolved === 'number' && leetcodeSolved >= 0 ? Math.floor(leetcodeSolved) : 0,
      weakAreas: Array.isArray(weakAreas)
        ? weakAreas.filter((w) => typeof w === 'string' && w.trim()).map((w) => w.trim())
        : [],
    };

    const created = await userService.createUser(userData);
    return successResponse(res, created, 201);
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 'A user with this email address already exists.', 409, 'DUPLICATE_EMAIL');
    }
    next(error);
  }
}

/**
 * GET /api/users/:id
 * Retrieve a user profile by ID
 */
export async function getUserHandler(req, res, next) {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      return errorResponse(res, 'User ID must be specified.', 400, 'VALIDATION_ERROR');
    }

    const user = await userService.getUserById(id);
    if (!user) {
      return errorResponse(res, `User with ID "${id}" was not found.`, 404, 'USER_NOT_FOUND');
    }

    return successResponse(res, user, 200);
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/users/:id
 * Update an existing user profile
 */
export async function updateUserHandler(req, res, next) {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      return errorResponse(res, 'User ID must be specified.', 400, 'VALIDATION_ERROR');
    }

    const updatePayload = req.body || {};
    if (Object.keys(updatePayload).length === 0) {
      return errorResponse(res, 'Update payload cannot be empty.', 400, 'VALIDATION_ERROR');
    }

    // Validate email if present in update
    if (updatePayload.email && !EMAIL_REGEX.test(updatePayload.email.trim())) {
      return errorResponse(res, 'Invalid email format.', 400, 'VALIDATION_ERROR');
    }

    const updated = await userService.updateUser(id, updatePayload);
    if (!updated) {
      return errorResponse(res, `User with ID "${id}" was not found.`, 404, 'USER_NOT_FOUND');
    }

    return successResponse(res, updated, 200);
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/users/:id
 * Remove a user profile
 */
export async function deleteUserHandler(req, res, next) {
  try {
    const { id } = req.params;
    if (!id || typeof id !== 'string') {
      return errorResponse(res, 'User ID must be specified.', 400, 'VALIDATION_ERROR');
    }

    const deleted = await userService.deleteUser(id);
    if (!deleted) {
      return errorResponse(res, `User with ID "${id}" was not found.`, 404, 'USER_NOT_FOUND');
    }

    return successResponse(res, { deleted: true, id }, 200);
  } catch (error) {
    next(error);
  }
}
