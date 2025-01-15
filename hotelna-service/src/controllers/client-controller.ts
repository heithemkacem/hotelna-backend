import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import { Profile, Client, Hotel, IHotel, IClient, Service } from "../database";
import { successResponse, errorResponse } from "../utils";
import { CustomRequest } from "./types";
import mongoose from "mongoose";
import ServiceRequest from "../database/models/serive-request/service-request";

// Change Password Function
const changePassword = async (req: CustomRequest, res: any, ) => {
  try {
    const userId = req.user?.profile.id; // Extract user ID from req.user
    const { newPassword, confirmNewPassword } = req.body;

    // Check if new password and confirm password match
    if (newPassword !== confirmNewPassword) {
      return errorResponse(res, "New password and confirm password do not match.", 400);
    }

    // Find the profile and update the password
    const profile = await Profile.findById(userId);
    if (!profile) {
      return errorResponse(res, "User not found.", 404);
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password in the database
    profile.password = hashedPassword;
    await profile.save();

    // Update the login history in the Client model
   
  
      const historyMessage : any = `Password changed on ${new Date().toISOString()}`;
      profile.loginHistory.push(historyMessage);
      await profile.save();
    

    return successResponse(res, "Password changed successfully.");
  } catch (error) {
    console.error("Error changing password:", error);
    return errorResponse(res, "Failed to change password.", 500);
  }
};

// View Login History Function
const viewLoginHistory = async (req: any, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.profile.id; // Extract user ID from req.user
    console.log(userId)

    // Find the client associated with the profile
    const client = await Profile.findOne({ _id: userId });
    if (!client) {
      return errorResponse(res, "User not found.", 404);
    }

    // Return the login history
    const loginHistory = client.loginHistory || [];
    return successResponse(res, "Login history retrieved successfully.", { loginHistory });
  } catch (error) {
    console.error("Error retrieving login history:", error);
    return errorResponse(res, "Failed to retrieve login history.", 500);
  }
};
const enterHotel = async (req: any, res: Response) => {
  try {
    const { hotelKey } = req.body;
    const userId = req.user?.client.id; // Get the user ID from the middleware

    if (!userId) {
      return errorResponse(res, "Unauthorized", 401);
    }

    // Find the client and their profile
    const client = await Client.findById(userId) as IClient;
    const profile = await Profile.findById(client?.profile);

    if (!client || !profile) {
      return errorResponse(res, "Client or profile not found", 404);
    }

    // Find the hotel by key
    const hotel = await Hotel.findOne({ key: hotelKey }) as IHotel;
    if (!hotel) {
      return errorResponse(res, "Hotel not found", 404);
    }

    // Update the client's current hotel
    client.current_hotel = hotel._id;

    // Add the hotel to the client's visited hotels if not already there
    if (!client.visited_hotels.some(hotelId => hotelId.toString() === hotel._id.toString())) {
      client.visited_hotels.push(hotel._id);
    }

    // Add an entry to the profile's login history
    const date = new Date().toLocaleString(); // Format the date and time
    if (!profile.loginHistory) {
      profile.loginHistory = [];
    }
    profile.loginHistory.push(`Entered hotel: ${hotel.name} on ${date}`);

    // Add the client to the hotel's current clients if not already there
    if (!hotel.current_clients.some(clientId => clientId.toString() === client._id.toString())) {
      hotel.current_clients.push(client._id);
    }

    // Save all changes
    await client.save();
    await profile.save();
    await hotel.save();

    return successResponse(res, "Successfully entered the hotel");
  } catch (error: any) {
    return errorResponse(res, error.message || "Server error", 500);
  }
};

export const requestService = async (req: Request, res: Response) => {
  try {
    const { hotelKey, roomNumber, serviceKey, message } = req.body;
    let user :any = req.user
    const  clientId = user.client.id
console.log(clientId)
    // Find the hotel by its unique key
    const hotel = await Hotel.findOne({ key: hotelKey });
    if (!hotel) {
      return errorResponse(res, "Hotel not found", 404);
    }

    // Find the client by their ID and ensure they are in the correct hotel
    const client:any = await Client.findById(clientId);
    console.log(client)
    if (!client || client?.current_hotel.toString() !== hotel._id.toString()) {
      return errorResponse(res, "Client not found in this hotel", 404);
    }

    const service = await Service.findOne({ key: serviceKey });
    if (!service) {
      return errorResponse(res, "Service not found", 404);
    }

    // Check if the service has status 'dispo'
    const serviceInHotel = hotel.services.find(
      (entry: any) => entry.service.toString() === service._id.toString() && entry.status === 'dispo'
    );
    if (!serviceInHotel) {
      return errorResponse(res, "Service is not available at the moment", 400);
    }

    // Create the service request
    const serviceRequest = new ServiceRequest({
      client: client._id,
      hotel: hotel._id,
      service: service._id,
      roomNumber,
      message,
      status: 'pending', // Default status
    });

    // Save the service request
    await serviceRequest.save();

    // Return the created service request
    return successResponse(res, "Service request submitted successfully", {
      serviceRequest,
    });
  } catch (error: any) {
    return errorResponse(res, error.message || "Server error", 500);
  }
};
export default {
  changePassword,
  viewLoginHistory,
  enterHotel,
  requestService
};
