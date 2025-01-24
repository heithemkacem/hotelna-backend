import { ErrorRequestHandler } from "express";
import { ApiError } from "../utils";
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
export const errorConverter: ErrorRequestHandler = (err, req, res, next) => {
  let error = err;
  if (!(error instanceof ApiError)) {
    const statusCode =
      error.statusCode ||
      (error instanceof Error
        ? 400 // Bad Request
        : 500); // Internal Server Error
    const message =
      error.message ||
      (statusCode === 400 ? "Bad Request" : "Internal Server Error");
    error = new ApiError(statusCode, message, false, err.stack.toString());
  }
  next(error);
};

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  let { statusCode, message } = err;
  if (process.env.NODE_ENV === "production" && !err.isOperational) {
    statusCode = 500; // Internal Server Error
    message = "Internal Server Error";
  }

  res.locals.errorMessage = err.message;

  const response = {
    code: statusCode,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  };

  if (process.env.NODE_ENV === "development") {
    console.error(err);
  }

  res.status(statusCode).json(response);
  next();
};


// Define an interface for req.user
declare global {
  namespace Express {
    interface Request {
      user?: { id: string };
    }
  }
}

export const verifyToken = (req: any, res: any, next: any) => {
  try {
    // Get the token from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Access token is missing or invalid.' });
    }

    const token = authHeader.split(' ')[1];

   
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };

   
    req.user = decoded;

    next(); 
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(403).json({ message: 'Invalid or expired token.' });
  }
};
export const verifyRole = (allowedRoles: string[]) => {
  return (req: any, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user?.profile.type)) {
      return res.status(403).json({ message: 'Access denied. You do not have the required role.' });
    }

    next();
  };
};
import { ObjectSchema } from 'joi';
import { Profile } from "../database";

export const validateRequest = (schema: ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const validationErrors = error.details.map((err) => err.message);
      return res.status(400).json({
        ok: false,
        status: 'Validation Error',
        errors: validationErrors,
      });
    }

    next();
  };
};
export const checkProfileBlocked = async (req: any, res: Response, next: NextFunction) => {
  try {
    // Assuming the user ID is in req.user (decoded from the token)
    const profileId = req.user?.profile.id;  // This should match the 'id' from your JWT payload
    
    // Find the profile by ID
    const profile = await Profile.findById(profileId);
    
    if (!profile) {
      return res.status(404).json({ message: 'Profile not found.' });
    }

    // Check if the profile is blocked
    if (profile.blocked) {
      return res.status(403).json({ message: 'Your account is blocked.' });
    }

    // Proceed if profile is not blocked
    next();
  } catch (error) {
    console.error('Error checking profile status:', error);
    return res.status(500).json({ message: 'Internal server error.' });
  }
};