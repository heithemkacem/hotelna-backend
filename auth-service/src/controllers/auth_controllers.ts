import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Profile, IProfile, IClient } from "../database/index"; // Profile model
import { Client, OTP } from "../database/index"; // Client and OTP models
import bcrypt from "bcryptjs";
import {
  ApiError,
  encryptPassword,
  isPasswordMatch,
  successResponse,
  errorResponse,
} from "../utils";
import config from "../config/config";
import { generateOTP } from "../utils/index";
import { rabbitMQService } from "../services/RabbitMQService";
import mongoose from "mongoose";
const { limit } = config;

const jwtSecret = config.JWT_SECRET as string;

const COOKIE_EXPIRATION_DAYS = 90; // cookie expiration in days
const expirationDate = new Date(
  Date.now() + COOKIE_EXPIRATION_DAYS * 24 * 60 * 60 * 1000
);
const cookieOptions = {
  expires: expirationDate,
  secure: config.env === "production", // Ensure cookies are secure in production
  httpOnly: true,
};
const saltRounds = limit ? Number(limit) : 10;
// Utility function to create and send the JWT token
const createSendToken = async (user: IProfile, res: Response) => {
  const { _id, email, type } = user;

  // Create JWT token with a 1-day expiration
  const token = jwt.sign({ id: _id, email, type }, jwtSecret, {
    expiresIn: "30d",
  });

  // Send the JWT token as a cookie
  res.cookie("jwt", token, cookieOptions);

  return token;
};

const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    console.log(name);
    const userExists = await Profile.findOne({ email });
    console.log(userExists);
    if (userExists) {
      return res.status(400).json({
        ok: false,
        status: "Failed",
        message: "Email already exists!",
      });
    }

    const otp = generateOTP();
    const hashedOTP = await bcrypt.hash(otp, saltRounds);
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 3);

    try {
      await rabbitMQService.sendEmailNotification(
        email,
        "OTP for Account Registration",
        `Your OTP for registration is: ${otp}`
      );
    } catch (emailError) {
      return errorResponse(
        res,
        "Failed to send OTP email. Please try again later."
      );
    }

    await OTP.create({
      email,
      otp: hashedOTP,
      type: "created-account",
      createdAt: new Date(),
      expiresAt: otpExpiry,
    });
    const client = (await Client.create({
      visited_hotels: [],
      notifications: true,
      sounds: true,
      name: name,
    })) as IClient;

    const profile = (await Profile.create({
      email,
      password: await encryptPassword(password),
      type: "client",
      isVerified: false,
      user_id: client._id,
    })) as IProfile;
    client.profile = profile._id as unknown as mongoose.Types.ObjectId;
    await client.save();
    return successResponse(
      res,
      "Registration successful. Please check your email for the OTP."
    );
  } catch (error: any) {
    console.log(error);
    return res
      .status(500)
      .json({ ok: false, status: "Failed", message: error.message });
  }
};

// Login user function
const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find the profile by email
    const profile = await Profile.findOne({ email }).select("+password");

    // If no profile is found or password is incorrect
    if (
      !profile ||
      !(await isPasswordMatch(password, profile.password as string))
    ) {
      throw new ApiError(400, "Incorrect email or password");
    }

    // Check if the user is verified
    if (!profile.isVerified) {
      return res.json({
        ok: false,
        status: "Verify",
        message: "Account is not verified. Please verify your email first.",
      });
    }

    // Create JWT token and send it in a cookie
    const token = await createSendToken(profile, res);

    // Send success response with token
    return successResponse(res, "User logged in successfully", {
      token,
      role: profile.type,
      user_id: profile.user_id,
    });
  } catch (error: any) {
    return errorResponse(res, error.message || "Server error", 500);
  }
};

export default {
  register,
  login,
};
