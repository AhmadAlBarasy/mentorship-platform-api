import Joi from "joi";

// --- Request body schema (exported so router can reuse it) ---
export const createSessionRequestSchema = Joi.object({
  serviceId: Joi.string().required(),
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),            // YYYY-MM-DD
  startTime: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required(), // HH:mm 24h
  communityId: Joi.string().required(),
  agenda: Joi.string().max(5000).optional().allow('', null),
});
