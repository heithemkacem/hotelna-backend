import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { Profile, OTP } from "../database/index";
import { successResponse, errorResponse, generateOTP } from "../utils";
import jwt from "jsonwebtoken";
import config from "../config/config";
import { rabbitMQService } from "../services/RabbitMQService";
import { TwillioService } from "../services";
const { limit } = config;
const saltRounds = limit ? Number(limit) : 10;
// OTP Validation Function
const twillioService = new TwillioService();
const validateOTP = async (req: Request, res: Response) => {
  try {
    const { email, otp, type } = req.body;
    const otpRecord = await OTP.findOne({ email, type }).sort({
      createdAt: -1,
    });
    if (!otpRecord) {
      return errorResponse(res, "Invalid OTP or OTP has expired.", 400);
    }

    const isMatch = await bcrypt.compare(otp, otpRecord.otp);
    if (!isMatch) {
      return errorResponse(res, "Invalid OTP.", 400);
    }

    const profile = await Profile.findOne({ email });
    if (!profile) {
      return errorResponse(res, "User not found.", 404);
    }

    profile.isVerified = true;
    await profile.save();
    return successResponse(res, "Account successfully verified.");
  } catch (error: any) {
    return errorResponse(res, error.message || "Server error", 500);
  }
};
const forgetPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const profile = await Profile.findOne({ email });
    if (!profile) {
      return errorResponse(res, "Email does not exist.", 404);
    }

    const otp = generateOTP();
    console.log(otp, "forget password");
    const hashedOTP = await bcrypt.hash(otp, saltRounds);
    await rabbitMQService.sendEmailNotification(
      email,
      "Reset Password OTP",
      `Your OTP for resetting your password is: ${otp}`
    );

    await OTP.create({
      email,
      otp: hashedOTP,
      type: "reset-password",
      createdAt: new Date(),
    });

    return successResponse(res, "OTP sent to your email for password reset.");
  } catch (error: any) {
    return errorResponse(res, error.message || "Server error", 500);
  }
};
const sendPhoneOTP = async (req: Request, res: Response) => {
  try {
    const { phone, email } = req.body;
    const profile = await Profile.findOne({ email });
    if (!profile) {
      return errorResponse(res, "User not found.", 404);
    }
    if (profile.isPhoneVerified) {
      return errorResponse(res, "Phone already verified.", 400);
    }
    if (profile.phone) {
      return errorResponse(res, "Phone already exists.", 400);
    }
    console.log(phone, "sendPhoneOTP");
    await twillioService.sendVerification(phone);
    return successResponse(res, "OTP sent to your phone for verification.");
  } catch (error: any) {
    console.log(error);
    return errorResponse(res, error.message || "Server error", 500);
  }
};
const verifyPhoneOTP = async (req: Request, res: Response) => {
  try {
    const { email, phone, code } = req.body;
    if (!phone || !code) {
      return errorResponse(res, "Phone or code is required.", 400);
    }
    console.log(phone, code, "verifyPhoneOTP");
    const verification = await twillioService.verifySMS(phone, code);
    if (verification === false) {
      return errorResponse(res, "OTP verification failed.", 400);
    }
    const profile = await Profile.findOne({ email });
    if (!profile) {
      return errorResponse(res, "User not found.", 404);
    }

    profile.isPhoneVerified = true;
    profile.phone = phone;
    await profile.save();
    return successResponse(res, "Phone successfully verified.");
  } catch (error: any) {
    console.log(error);
    return errorResponse(res, error.message || "Server error", 500);
  }
};

const resetPassword = async (req: Request, res: Response) => {
  try {
    const { newPassword, email } = req.body;

    const profile = await Profile.findOne({ email: email });
    if (!profile) {
      return errorResponse(res, "User not found.", 404);
    }

    profile.password = await bcrypt.hash(newPassword, saltRounds);
    await profile.save();

    return successResponse(res, "Password successfully reset.");
  } catch (error: any) {
    return errorResponse(res, error.message || "Server error", 500);
  }
};

const validateResetPasswordOTP = async (req: Request, res: Response) => {
  try {
    const { email, otp, type } = req.body;
    const otpRecord = await OTP.findOne({ email, type });

    if (!otpRecord) {
      return errorResponse(res, "Invalid OTP or OTP has expired.", 400);
    }

    const isMatch = await bcrypt.compare(otp, otpRecord.otp);
    if (!isMatch) {
      return errorResponse(res, "Invalid OTP.", 400);
    }

    // Generate a short-lived JWT token for password reset
    const resetToken = jwt.sign(
      { email },
      process.env.RESET_PASSWORD_SECRET as string,
      { expiresIn: "15m" }
    );

    return successResponse(res, "OTP successfully validated.", {
      message:
        "Use this token in the Authorization header to reset your password.",
      token: resetToken,
    });
  } catch (error: any) {
    return errorResponse(res, "Server error", 500);
  }
};



const resendOTP = async (req: Request, res: Response) => {
  try {
    const { email, type } = req.body;

    if (!["created-account", "reset-password"].includes(type)) {
      return errorResponse(res, "Invalid OTP type.", 400);
    }

    // Check for an existing OTP record
    const otpRecord = await OTP.findOne({ email, type });

    if (otpRecord) {
      const now = new Date();
      const lastSentTime = otpRecord.createdAt;
      const timeDifference = (now.getTime() - lastSentTime.getTime()) / 1000;

      // Prevent resending if less than 30 seconds have passed
      if (timeDifference < 30) {
        const remainingTime = 30 - Math.floor(timeDifference);
        return errorResponse(
          res,
          `Please wait ${remainingTime} seconds before requesting a new OTP.`,
          400
        );
      }

      // Delete old OTP if 30 seconds have passed
      await OTP.deleteOne({ email, type });
    }

    // Generate and hash a new OTP
    const otp = generateOTP();
    const hashedOTP = await bcrypt.hash(otp, saltRounds);

    // Save the new OTP in the database
    await OTP.create({
      email,
      otp: hashedOTP,
      type,
      createdAt: new Date(),
    });

    // Send the plain text OTP to the user
    const otpBody = `Your OTP for ${type} is: ${otp}`;
    console.log(otp, "resendOTP");
    await rabbitMQService.sendEmailNotification(email, `${type} OTP`, otpBody);
    return successResponse(res, "A new OTP has been sent to your email.");
  } catch (error: any) {
    return errorResponse(res, error.message || "Server error", 500);
  }
};

export default {
  validateOTP,
  forgetPassword,
  resendOTP,
  resetPassword,
  sendPhoneOTP,
  validateResetPasswordOTP,
  verifyPhoneOTP,
};
