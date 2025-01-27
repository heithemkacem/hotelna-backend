import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { Profile, IProfile, IClient, Hotel } from "../database/index"; // Profile model
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

const saltRounds = limit ? Number(limit) : 10;
// Utility function to create and send the JWT token
const createSendToken = async (
  user: IProfile,
  client: IClient,
  res: Response
) => {
  const { _id, email, type, name } = user;

  // Prepare the payload with client and profile data
  const payload = {
    id: _id,
    email,
    type,
    name,
    client_id: client._id,
  };

  // Create JWT token with a 30-day expiration
  const token = jwt.sign(payload, jwtSecret, { expiresIn: "30d" });

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

    // Generate OTP
    const otp = generateOTP();
    const hashedOTP = await bcrypt.hash(otp, saltRounds);
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 3);

    // Send OTP via email
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

    // Save OTP to database
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
      name,
      email,
      password: await encryptPassword(password),
      type: "client",
      user_id: client._id,
      source: "app",
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
    console.log(email);
    // Find the profile by email and include the password field
    const profile = await Profile.findOne({ email }).select(
      "password loginHistory isVerified isPhoneVerified type"
    );
    console.log(profile);
    // If no profile is found or the password is incorrect
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
        email: profile.email,
      });
    }
    if (!profile.isPhoneVerified) {
      return res.json({
        ok: false,
        status: "VerifyPhone",
        message: "Account is not verified. Please verify your email first.",
        email: profile.email,
      });
    }

    // Check user type and retrieve the associated data (Client or Hotel)
    let user: any;
    if (profile.type === "client") {
      user = await Client.findOne({ profile: profile._id });
      if (!user) {
        throw new ApiError(404, "Client data not found.");
      }
    } else if (profile.type === "hotel") {
      user = await Hotel.findOne({ profile: profile._id });
      if (!user) {
        throw new ApiError(404, "Hotel data not found.");
      }
    } else {
      throw new ApiError(400, "Invalid user type.");
    }
    console.log(new Date().toISOString());
    profile.loginHistory.unshift({
      action: "login",
      date: new Date().toISOString(),
    });
    // Create JWT token and send it in a cookie
    const token = await createSendToken(profile, user, res);

    console.log(token);

    // Send success response with the token
    return successResponse(res, "User logged in successfully", {
      token,
      role:
        profile.type === "client"
          ? user.current_hotel
            ? "client"
            : "client-no-hotel"
          : profile.type,
      userId: profile._id,
    });
  } catch (error: any) {
    return errorResponse(res, error.message || "Server error", 500);
  }
};
export default {
  register,
  login,
};
