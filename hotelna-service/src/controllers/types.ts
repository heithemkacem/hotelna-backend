import { Request } from "express";



// Extend the Request interface to include user
export interface CustomRequest extends Request {
  user: any;  // req.user has profile, and id is inside profile
}
