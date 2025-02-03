import Joi from "joi";

// DTO for creating a hotel
export const createHotelSchema = Joi.object({
  name: Joi.string().required().messages({
    "string.empty": "Hotel name is required.",
    "any.required": "Hotel name is required.",
  }),
  description: Joi.string().required().messages({
    "string.empty": "Description is required.",
    "any.required": "Description is required.",
  }),
  price: Joi.number().min(0).required().messages({
    "number.base": "Price must be a number.",
    "number.min": "Price must be greater than or equal to 0.",
    "any.required": "Price is required.",
  }),
  images: Joi.array().items(Joi.string().uri()).max(6).optional().messages({
    "array.max": "You can upload a maximum of 6 images.",
    "string.uri": "Each image must be a valid URL.",
  }),
});

// DTO for updating hotel position
export const updateHotelPositionSchema = Joi.object({
  position: Joi.object({
    latitude: Joi.number().required().messages({
      "number.base": "Latitude must be a number.",
      "any.required": "Latitude is required.",
    }),
    longitude: Joi.number().required().messages({
      "number.base": "Longitude must be a number.",
      "any.required": "Longitude is required.",
    }),
  }).required(),
});
