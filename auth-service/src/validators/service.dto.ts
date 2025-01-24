import Joi from 'joi';

// DTO for requesting a service
export const requestServiceSchema = Joi.object({
  hotelKey: Joi.string().required().messages({
    'string.empty': 'Hotel key is required.',
    'any.required': 'Hotel key is required.',
  }),
  roomNumber: Joi.string().required().messages({
    'string.empty': 'Room number is required.',
    'any.required': 'Room number is required.',
  }),
  serviceKey: Joi.string().required().messages({
    'string.empty': 'Service key is required.',
    'any.required': 'Service key is required.',
  }),
  message: Joi.string().min(1).required().messages({
    'string.empty': 'Message is required.',
    'any.required': 'Message is required.',
  }),
});
