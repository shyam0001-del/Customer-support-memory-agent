/**
 * Standardized API response formatters
 */

export const successResponse = (res, data = {}, statusCode = 200, extra = {}) => {
  return res.status(statusCode).json({
    success: true,
    data,
    ...extra,
  });
};

export const errorResponse = (res, message = 'Internal Server Error', statusCode = 500, code = 'INTERNAL_ERROR', details = null) => {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  });
};
