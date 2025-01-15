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
import Settings from "../database/models/settings/settings";
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
const createSendToken = async (user: IProfile, client: IClient, res: Response) => {
  const { _id, email, type, isVerified, createdAt } = user;

  // Prepare the payload with client and profile data
  const payload = {
    profile: {
      id: _id,
      email,
      type,
      isVerified,
      createdAt,
    },
    client: {
      id: client._id,
      name: client.name,
      current_hotel: client.current_hotel,
      visited_hotels: client.visited_hotels,
      createdAt: client.createdAt,
    },
  };

  // Create JWT token with a 30-day expiration
  const token = jwt.sign(payload, jwtSecret, { expiresIn: "30d" });

  // Send the JWT token as a cookie
  res.cookie("jwt", token, cookieOptions);

  return token;
};

 const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body;
    console.log(name);

    // Check if user already exists
    const userExists = await Profile.findOne({ email });
    if (userExists) {
      return res.json({
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

    // Create Profile
    const profile = await Profile.create({
      email,
      password: await encryptPassword(password),
      type: "client",
      isVerified: false,
    });

    // Create Client
    const client = await Client.create({
      profile: profile._id,
      visited_hotels: [],
      name: name,
    });

    // Create Settings for the Client
    await Settings.create({
      user: client._id,
      userType: "Client",
      notification: true,
      emailNotification: true,
      bookingUpdate: true,
      newMessage: true,
      marketing: true,
    });

    return successResponse(
      res,
      "Registration successful. Please check your email for the OTP."
    );
  } catch (error: any) {
    return res
      .status(500)
      .json({ ok: false, status: "Failed", message: error.message });
  }
};

// Login user function
const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find the profile by email and include the password field
    const profile = await Profile.findOne({ email }).select("+password");

    // If no profile is found or the password is incorrect
    if (!profile || !(await isPasswordMatch(password, profile.password as string))) {
      throw new ApiError(400, "Incorrect email or password");
    }

    // Check if the user is verified
    if (!profile.isVerified) {
      return res.json({
        ok: false,
        status: "Failed",
        message: "Account is not verified. Please verify your email first.",
      });
    }

    // Retrieve the associated client data
    const client = await Client.findOne({ profile: profile._id });

    // If no associated client is found, throw an error
    if (!client) {
      throw new ApiError(404, "Client data not found.");
    }

    // Create JWT token and send it in a cookie
    const token = await createSendToken(profile, client, res);

    // Send success response with the token
    return successResponse(res, "User logged in successfully", { token });
  } catch (error: any) {
    return errorResponse(res, error.message || "Server error", 500);
  }
};


export default {
  register,
  login,
};
