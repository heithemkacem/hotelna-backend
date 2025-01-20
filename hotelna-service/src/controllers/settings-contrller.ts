import { Response } from "express";
import { CustomRequest } from "./types";  // Make sure the correct import path
import { errorResponse, successResponse } from "../utils";
import { Settings } from "../database";

export const updateSettings = async (req: CustomRequest, res: any) => {
  try {
    const { notification, emailNotification, bookingUpdate, newMessage, marketing } = req.body;

  
    const userId = req.user.client.id;

    // Validate the userId
    if (!userId) {
      return errorResponse(res, 'User ID is required.');
    }

    // Find the user's settings by user ID
    const settings = await Settings.findOne({ user: userId });

    if (!settings) {
      return errorResponse(res, 'Settings not found for the provided user ID.');
    }

    // Update settings if provided in the request body
    if (notification !== undefined) settings.notification = notification;
    if (emailNotification !== undefined) settings.emailNotification = emailNotification;
    if (bookingUpdate !== undefined) settings.bookingUpdate = bookingUpdate;
    if (newMessage !== undefined) settings.newMessage = newMessage;
    if (marketing !== undefined) settings.marketing = marketing;

    // Save updated settings
    await settings.save();

    return successResponse(res, 'Settings updated successfully.', { settings });
  } catch (error) {
    console.error('Error updating settings:', error);
    return errorResponse(res, 'Failed to update settings.', 500);
  }
};
