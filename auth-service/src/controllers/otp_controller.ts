import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { Profile, OTP } from "../database/index";
import { successResponse, errorResponse, generateOTP } from "../utils";
import jwt from "jsonwebtoken";
import config from "../config/config";
import { rabbitMQService } from "../services/RabbitMQService";
const { limit } = config;
const { RESET_PASSWORD_SECRET } = config;
const saltRounds = limit ? Number(limit) : 10;
// OTP Validation Function
const validateOTP = async (req: Request, res: Response) => {
  try {
    const { email, otp, type } = req.body;
    const otpRecord = await OTP.findOne({ email, type });
    if (!otpRecord) {
      return res.json({
        ok: false,
        status: "Failed",
        message: "Invalid OTP or OTP has expired.",
      });
    }

    const isMatch = await bcrypt.compare(otp, otpRecord.otp);
    if (!isMatch) {
      return res.json({ ok: false, status: "Failed", message: "Invalid OTP." });
    }

    const profile = await Profile.findOne({ email });
    if (!profile) {
      return res.json({
        ok: false,
        status: "Failed",
        message: "User not found.",
      });
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
      return res.json({
        ok: false,
        status: "Failed",
        message: "Email does not exist.",
      });
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
    const { phone } = req.body;
    console.log(phone, "sendPhoneOTP");
    await rabbitMQService.sendSMSNotification(phone);

    return successResponse(res, "OTP sent to your email for password reset.");
  } catch (error: any) {
    console.log(error);
    return errorResponse(res, error.message || "Server error", 500);
  }
};
const verifyPhoneOTP = async (req: Request, res: Response) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) {
      return errorResponse(res, "Phone or code is required.", 400);
    }
    console.log(phone, code, "verifyPhoneOTP");
    await rabbitMQService.verifyPhoneOTP(phone, code);
    const verification =
      (await rabbitMQService.consumeVerificationFailedNotifications()) as any;
    console.log(verification, "verification");
    if (verification === false) {
      return errorResponse(res, "OTP verification failed.", 400);
    }
    return successResponse(res, "OTP sent to your email for password reset.");
  } catch (error: any) {
    console.log(error);
    return errorResponse(res, error.message || "Server error", 500);
  }
};

const resetPassword = async (req: Request, res: Response) => {
  try {
    const { newPassword } = req.body;

    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return errorResponse(res, "Authorization token is missing.", 401);
    }

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(
        token,
        process.env.RESET_PASSWORD_SECRET as string
      ) as { email: string };
    } catch (err) {
      return errorResponse(res, "Invalid or expired token.", 401);
    }

    const profile = await Profile.findOne({ email: decoded.email });
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
      return res.json({
        ok: false,
        status: "Failed",
        message: "Invalid OTP or OTP has expired.",
      });
    }

    const isMatch = await bcrypt.compare(otp, otpRecord.otp);
    if (!isMatch) {
      return res.json({ ok: false, status: "Failed", message: "Invalid OTP." });
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
      return res.json({
        ok: false,
        status: "Failed",
        message: "Invalid OTP type.",
      });
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
        return res.json({
          ok: false,
          status: "Failed",
          message: `Please wait ${remainingTime} seconds before requesting a new OTP.`,
        });
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
