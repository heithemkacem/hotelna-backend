import mongoose from "mongoose";
import { Profile } from "../database";
import { errorResponse, successResponse } from "../utils";
import ExpoPushToken from "../database/models/push-token/push-token";
import { CustomRequest } from "./types";
import bcrypt from "bcrypt";
export const getProfile = async (req: any, res: any) => {
  try {
    const { id } = req.params;

    // Validate ID format
    if (!id) {
      return res.status(400).json({
        ok: false,
        status: "Bad Request",
        message: "Invalid ID ",
      });
    }

    // Find service by ID with selected fields
    const profile = await Profile.findById(id).lean();

    if (!profile) {
      return res.status(404).json({
        ok: false,
        status: "Not Found",
        message: "Profile not found",
      });
    }

    return res.status(200).json({
      ok: true,
      status: "Success",
      message: "Service retrieved successfully",
      data: profile,
    });
  } catch (error) {
    console.error("Error retrieving service:", error);
    return res.status(500).json({
      ok: false,
      status: "Error",
      message: "Error retrieving ptofile",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};
export const updateProfile = async (req: any, res: any) => {
  try {
    const { userId } = req.params;
    const updateData = req.body;

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        ok: false,
        status: "Bad Request",
        message: "Invalid user ID format",
      });
    }

    // Update profile and return the new version
    const updatedProfile = await Profile.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updatedProfile) {
      return res.status(404).json({
        ok: false,
        status: "Not Found",
        message: "Profile not found",
      });
    }

    return res.status(200).json({
      ok: true,
      status: "Success",
      message: "Profile updated successfully",
      data: updatedProfile,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return res.status(500).json({
      ok: false,
      status: "Error",
      message: "Error updating profile",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};

export const addToken = async (req: any, res: any) => {
  try {
    const { expoPushToken, type, device_id, device_type } = req.body;
    let user: any = req.user;
    const profile = await Profile.findById(user.id);
    if (!profile) {
      return errorResponse(res, "Profile not found", 404);
    }
    profile.notification = true;
    profile.emailNotification = true;
    profile.bookingUpdate = true;
    profile.newMessage = true;
    profile.marketing = true;
    profile?.save();
    // Validate inputs
    if (!expoPushToken || !type || !device_id || !device_type) {
      return errorResponse(
        res,
        "All fields are required: expoPushToken, type, device_id, and device_type",
        400
      );
    }

    // Ensure the user has the proper role
    const validTypes = ["hotel", "client", "admin"];
    if (!validTypes.includes(type)) {
      return errorResponse(
        res,
        "Invalid type. Must be one of: hotel, client, admin",
        400
      );
    }

    // Check if the token already exists
    const existingToken = await ExpoPushToken.findOne({
      expoPushToken: expoPushToken,
    });
    if (existingToken) {
      return successResponse(res, "Token already exists", {
        token: existingToken,
      });
    }

    // Check if a token exists for the device_id and deactivate it
    await ExpoPushToken.updateMany(
      { device_id, active: true },
      { $set: { active: false } }
    );

    // Create a new token
    const newToken = new ExpoPushToken({
      expoPushToken,
      type,
      active: true,
      device_id,
      device_type,
      user_id: profile._id,
    });

    await newToken.save();

    return successResponse(res, "Expo push token added successfully", {
      token: newToken,
    });
  } catch (error: any) {
    console.log(error);
    return errorResponse(res, error.message || "Server error", 500);
  }
};
// Change Password Function
export const changePassword = async (req: CustomRequest, res: any) => {
  try {
    const userId = req.user?.id; // Extract user ID from req.user
    const { oldPassword, newPassword, confirmNewPassword } = req.body;

    // Check if new password and confirm password match
    if (newPassword !== confirmNewPassword) {
      return errorResponse(
        res,
        "New password and confirm password do not match.",
        400
      );
    }

    // Check if old password is provided
    if (!oldPassword) {
      return errorResponse(res, "Old password is required.", 400);
    }

    // Find the profile
    const profile = await Profile.findById(userId);
    if (!profile) {
      return errorResponse(res, "User not found.", 404);
    }

    // Verify old password
    const isPasswordValid = await bcrypt.compare(oldPassword, profile.password);
    if (!isPasswordValid) {
      return errorResponse(res, "Old password is incorrect.", 401);
    }

    // Check if new password is different from old
    const isSamePassword = await bcrypt.compare(newPassword, profile.password);
    if (isSamePassword) {
      return errorResponse(
        res,
        "New password must be different from the old password.",
        400
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password and login history
    profile.password = hashedPassword;
    profile.loginHistory.unshift({
      action: "password-change",
      date: new Date().toISOString(),
    });
    await profile.save();

    return successResponse(res, "Password changed successfully.");
  } catch (error) {
    console.error("Error changing password:", error);
    return errorResponse(res, "Failed to change password.", 500);
  }
};
