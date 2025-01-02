import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Profile, IProfile } from "../database/index"; // Profile model
import { Client, OTP } from "../database/index"; // Client and OTP models
import { ApiError, encryptPassword, isPasswordMatch, successResponse, errorResponse } from "../utils";
import config from "../config/config";
import { generateOTP, sendEmail } from '../utils/index';

const jwtSecret = config.JWT_SECRET as string;

const COOKIE_EXPIRATION_DAYS = 90; // cookie expiration in days
const expirationDate = new Date(Date.now() + COOKIE_EXPIRATION_DAYS * 24 * 60 * 60 * 1000);
const cookieOptions = {
  expires: expirationDate,
  secure: config.env === "production", // Ensure cookies are secure in production
  httpOnly: true,
};

// Utility function to create and send the JWT token
const createSendToken = async (user: IProfile, res: Response) => {
  const { _id, email, type } = user;

  // Create JWT token with a 1-day expiration
  const token = jwt.sign({ id: _id, email, type }, jwtSecret, { expiresIn: "30" });

  // Send the JWT token as a cookie
  res.cookie("jwt", token, cookieOptions);

  return token;
};


const register = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Check if the user already exists
    const userExists = await Profile.findOne({ email });
    if (userExists) {
      return res.json({
        ok: false,
        status: 'Failed',
        message: 'Email already exists!',
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 3); 

    // Send OTP to the user's email
    try {
      await sendEmail(email, "OTP for Account Registration", `Your OTP for registration is: ${otp}`);
    } catch (emailError) {
      return errorResponse(res, "Failed to send OTP email. Please try again later.");
    }

    // Create the OTP document and save it to the database
    const otpDoc = await OTP.create({
      email,
      otp,
      type: 'created-account',
      createdAt: new Date(),
      expiresAt: otpExpiry,
    });

    // Create the profile but don't verify it yet
    const profile = await Profile.create({
      email,
      password: await encryptPassword(password),
      type: 'client', // Setting default type as 'client'
      isVerified: false, // User is not verified yet
    });

    // Return success response
    return successResponse(res, 'Registration successful. Please check your email for the OTP.', {
      profileId: profile._id, // Optionally return profile ID
    });
  } catch (error: any) {
    return res.status(500).json({
      ok: false,
      status: 'Failed',
      message: error.message,
    });
  }
};

// Login user function
const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find the profile by email
    const profile = await Profile.findOne({ email }).select("+password");

    // If no profile is found or password is incorrect
    if (!profile || !(await isPasswordMatch(password, profile.password as string))) {
      throw new ApiError(400, "Incorrect email or password");
    }

    // Check if the user is verified
    if (!profile.isVerified) {
      return res.json({
        ok: false,
        status: 'Failed',
        message: 'Account is not verified. Please verify your email first.',
      });
    }

    // Create JWT token and send it in a cookie
    const token = await createSendToken(profile, res);

    // Send success response with token
    return successResponse(res, "User logged in successfully", { token });
  } catch (error: any) {
    return errorResponse(res, error.message || "Server error", 500);
  }
};

export default {
  register,
  login,
};
