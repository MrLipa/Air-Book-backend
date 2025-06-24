const Joi = require('joi');
const ROLES_LIST = require('../config/rolesList');

const registerSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string()
    .valid(...Object.values(ROLES_LIST))
    .default(ROLES_LIST.User),
});

module.exports = { registerSchema };
