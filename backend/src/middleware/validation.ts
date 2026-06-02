import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: false,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      // Log validation errors for debugging
      console.error('Validation failed:', {
        body: req.body,
        errors: errors
      });

      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: errors,
        },
      });
      return;
    }

    req.body = value;
    next();
  };
};

export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: false,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request query parameters',
          details: errors,
        },
      });
      return;
    }

    req.query = value;
    next();
  };
};

const dateSchema = Joi.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .custom((value, helpers) => {
    const parts = value.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return helpers.error('any.invalid');
    }
    return value;
  });

const timeSchema = Joi.string().regex(/^([0-1]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/);

// Common validation schemas
export const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  name: Joi.string().min(1).max(255).required(),
  phoneNumber: Joi.string().min(10).max(20).optional().allow('', null),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const createTaskSchema = Joi.object({
  title: Joi.string().min(1).max(255).required(),
  description: Joi.string().optional().allow('', null),
  dueDate: dateSchema.optional().allow('', null),
  dueTime: timeSchema.optional().allow('', null),
  endTime: timeSchema.optional().allow('', null),
  priority: Joi.string().valid('low', 'medium', 'high', 'critical').optional(),
  isCritical: Joi.boolean().optional().default(false),
});

export const updateTaskSchema = Joi.object({
  title: Joi.string().min(1).max(255).optional(),
  description: Joi.string().optional().allow('', null),
  dueDate: dateSchema.optional().allow('', null),
  dueTime: timeSchema.optional().allow('', null),
  endTime: timeSchema.optional().allow('', null),
  priority: Joi.string().valid('low', 'medium', 'high', 'critical').optional(),
  isCritical: Joi.alternatives().try(
    Joi.boolean(),
    Joi.string().valid('true', 'false').custom((value) => value === 'true')
  ).optional(),
  isCompleted: Joi.alternatives().try(
    Joi.boolean(),
    Joi.string().valid('true', 'false').custom((value) => value === 'true')
  ).optional(),
  displayOrder: Joi.number().integer().optional(),
});

export const listTasksQuerySchema = Joi.object({
  priority: Joi.string().valid('low', 'medium', 'high', 'critical').optional(),
  isCompleted: Joi.boolean().optional(),
  dateFrom: dateSchema.optional(),
  dateTo: dateSchema.optional(),
  search: Joi.string().optional().allow(''),
  page: Joi.number().integer().min(1).optional(),
  pageSize: Joi.number().integer().min(1).max(100).optional(),
});

export const reorderTasksSchema = Joi.object({
  taskIds: Joi.array()
    .items(Joi.number().integer().required())
    .min(1)
    .unique()
    .required(),
});

export const duplicateDaySchema = Joi.object({
  sourceDate: dateSchema.required(),
  targetDate: dateSchema.required(),
}).custom((value, helpers) => {
  if (value.sourceDate === value.targetDate) {
    return helpers.error('any.invalid');
  }
  return value;
});
