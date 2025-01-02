import { Request, Response } from "express";
import bcrypt from "bcryptjs";  
import { Profile, OTP } from "../database/index";
import { successResponse, errorResponse, generateOTP } from "../utils";
import { sendEmail } from "../utils";
import config from "../config/config";
const { limit } = config;
const saltRounds = limit ? Number(limit) : 10; 
// OTP Validation Function
const validateOTP = async (req: Request, res: Response) => {
  try {
    const { email, otp, type } = req.body;

    const otpRecord = await OTP.findOne({ email, type });
    
    if (!otpRecord) {
      return res.json({
        ok: false,
        status: 'Failed',
        message: 'Invalid OTP or OTP has expired.',
      });
    }

    // Compare the request OTP with the stored OTP
    if (otp !== otpRecord.otp) {
      return res.json({
        ok: false,
        status: 'Failed',
        message: 'Invalid OTP.',
      });
    }

    // Find the user's profile
    const profile = await Profile.findOne({ email });

    if (!profile) {
      return res.json({
        ok: false,
        status: 'Failed',
        message: 'User not found.',
      });
    }

    // Mark the profile as verified
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
        status: 'Failed',
        message: 'Email does not exist.',
      });
    }

    const otp = generateOTP();

    const otpBody = `Your OTP for resetting your password is: ${otp}`;
    await sendEmail(email, "Reset Password OTP", otpBody);

    // Save the OTP in the database with type 'reset-password'
    await OTP.create({
      email,
      otp: otp, // Store OTP as plain text
      type: 'reset-password',
      createdAt: new Date(),
    });

    return successResponse(res, "OTP sent to your email for password reset.");
  } catch (error: any) {
    return errorResponse(res, error.message || "Server error", 500);
  }
};

const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, newPassword } = req.body;

    const profile = await Profile.findOne({ email });

    if (!profile) {
      return res.json({
        ok: false,
        status: 'Failed',
        message: 'User not found.',
      });
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
        status: 'Failed',
        message: 'Invalid OTP or OTP has expired.',
      });
    }

    if (otp !== otpRecord.otp) {
      return res.json({
        ok: false,
        status: 'Failed',
        message: 'Invalid OTP.',
      });
    }

    return successResponse(res, 'OTP successfully validated.');
  } catch (error: any) {
    console.error("Error during OTP validation:", error.message);
    return errorResponse(res, 'Server error', 500);
  }
};

const resendOTP = async (req: Request, res: Response) => {
  try {
    const { email, type } = req.body;

    if (!['created-account', 'reset-password'].includes(type)) {
      return res.json({
        ok: false,
        status: 'Failed',
        message: 'Invalid OTP type.',
      });
    }

    const otpRecord = await OTP.findOne({ email, type });

    let otp;
    if (otpRecord) {
      // OTP exists, resend the same OTP
      otp = otpRecord.otp;
    } else {
      // OTP doesn't exist, generate a new one
      otp = generateOTP();

      // Save the OTP in the database
      await OTP.create({
        email,
        otp: otp, // Store OTP as plain text
        type,
        createdAt: new Date(),
      });
    }

    const otpBody = `Your OTP for ${type} is: ${otp}`;
    await sendEmail(email, `${type} OTP`, otpBody);

    return successResponse(res, "OTP has been resent to your email.");
  } catch (error: any) {
    return errorResponse(res, error.message || "Server error", 500);
  }
};

export default {
  validateOTP,
  forgetPassword,
  resendOTP,
  resetPassword,
  validateResetPasswordOTP
};
