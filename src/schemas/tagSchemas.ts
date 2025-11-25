import Joi from 'joi';

export const createTagSchema = Joi.object({
  name: Joi.string().min(1).max(50).required(),
  slug: Joi.string().min(1).max(50).allow(''),
  description: Joi.string().max(500).allow(''),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).allow('')
});

export const updateTagSchema = Joi.object({
  name: Joi.string().min(1).max(50),
  description: Joi.string().max(500).allow(''),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).allow(''),
  isActive: Joi.boolean()
});
