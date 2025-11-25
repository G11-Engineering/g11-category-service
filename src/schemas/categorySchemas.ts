import Joi from 'joi';

export const createCategorySchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  slug: Joi.string().min(1).max(100).allow(''),
  description: Joi.string().max(500).allow(''),
  parentId: Joi.string().uuid().allow(null),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).allow(''),
  icon: Joi.string().max(50).allow(''),
  sortOrder: Joi.number().integer().min(0).default(0)
});

export const updateCategorySchema = Joi.object({
  name: Joi.string().min(1).max(100),
  description: Joi.string().max(500).allow(''),
  parentId: Joi.string().uuid().allow(null),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).allow(''),
  icon: Joi.string().max(50).allow(''),
  sortOrder: Joi.number().integer().min(0),
  isActive: Joi.boolean()
});
