import { Request, Response, NextFunction } from "express";

import { Profile, Client, Hotel, IHotel, IClient, Service } from "../database";
import { successResponse, errorResponse } from "../utils";
import { CustomRequest } from "./types";
import mongoose from "mongoose";
import ServiceRequest from "../database/models/serive-request/service-request";
import ExpoPushToken from "../database/models/push-token/push-token";

// View Login History Function
export const viewLoginHistory = async (
  req: any,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.profile.id; // Extract user ID from req.user
    console.log(userId);

    // Find the client associated with the profile
    const client = await Profile.findOne({ _id: userId });
    if (!client) {
      return errorResponse(res, "User not found.", 404);
    }

    // Return the login history
    const loginHistory = client.loginHistory || [];
    return successResponse(res, "Login history retrieved successfully.", {
      loginHistory,
    });
  } catch (error) {
    console.error("Error retrieving login history:", error);
    return errorResponse(res, "Failed to retrieve login history.", 500);
  }
};
export const enterHotel = async (req: any, res: Response) => {
  try {
    const { hotelKey } = req.body;
    const userId = req.user?.client_id; // Get the user ID from the middleware
    // Find the client and their profile
    const client = (await Client.findById(userId)) as any;
    const profile = (await Profile.findById(req.user?.id)) as any;
    if (!client || !profile) {
      return errorResponse(res, "Client or profile not found", 404);
    }
    // Find the hotel by key
    const hotel = (await Hotel.findOne({ key: hotelKey })) as any;
    if (!hotel) {
      return errorResponse(res, "Hotel not found", 404);
    }
    // Update the client's current hotel
    client.current_hotel = hotel._id;
    // Add the hotel to the client's visited hotels if not already there
    if (
      !client.visited_hotels.some(
        (hotelId: string) => hotelId.toString() === hotel._id.toString()
      )
    ) {
      client.visited_hotels.push(hotel._id);
    }
    // Add an entry to the profile's login history
    const date = new Date().toLocaleString(); // Format the date and time
    profile.loginHistory.unshift({
      action: "enter-hotel",
      date: date,
    });
    // Add the client to the hotel's current clients if not already there
    if (
      !hotel.current_clients.some(
        (clientId: string) => clientId.toString() === client._id.toString()
      )
    ) {
      hotel.current_clients.push(client._id);
    }
    // Save all changes
    await client.save();
    await profile.save();
    await hotel.save();
    return successResponse(res, "Successfully entered the hotel", {
      token: req.token,
      role: req.user.type,
      userId: req.user.id,
    });
  } catch (error: any) {
    return errorResponse(res, error.message || "Server error", 500);
  }
};

export const requestService = async (req: Request, res: Response) => {
  try {
    const { hotelKey, roomNumber, serviceKey, message } = req.body;
    let user: any = req.user;
    const clientId = user.client.id;
    const profileId = user.profile.id;

    // Find the hotel by its unique key
    const hotel = await Hotel.findOne({ key: hotelKey });
    if (!hotel) {
      return errorResponse(res, "Hotel not found", 404);
    }

    // Find the client by their ID and ensure they are in the correct hotel
    const client: any = await Client.findById(clientId);
    if (
      !client ||
      !client.current_hotel ||
      !hotel._id ||
      client.current_hotel.toString() !== hotel._id.toString()
    ) {
      return errorResponse(res, "Client not found in this hotel", 404);
    }

    const clientProfile = await Profile.findById(profileId);
    if (!clientProfile) {
      return errorResponse(res, "Client not found", 404);
    }

    const service = await Service.findOne({ key: serviceKey });
    if (!service) {
      return errorResponse(res, "Service not found", 404);
    }

    // Check if the service has status 'dispo'
    const serviceInHotel = hotel.services.find(
      (entry: any) =>
        entry.service.toString() === service._id.toString() &&
        entry.status === "dispo"
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
      status: "pending", // Default status
    });

    // Save the service request
    await serviceRequest.save();

    // Prepare the activity message
    const activityMessage = `Requested service '${service.name}' for room number ${roomNumber}. Message: "${message}".`;

    // Push the activity log into the client's activities array
    client.activities.push(activityMessage);
    await client.save();

    // Return the created service request
    return successResponse(res, "Service request submitted successfully", {
      serviceRequest,
    });
  } catch (error: any) {
    return errorResponse(res, error.message || "Server error", 500);
  }
};
export const searchPeopleInSameHotel = async (req: any, res: Response) => {
  try {
    const userId = req.user?.profile.id; // Assuming the user's ID is stored in `req.user.id`
    const { name } = req.query; // Get the name filter from query parameters

    // Find the client associated with the logged-in user
    const client = await Client.findOne({ profile: userId });
    if (!client) {
      return errorResponse(res, "Client not found", 404);
    }

    // Ensure the client is currently in a hotel
    if (!client.current_hotel) {
      return errorResponse(res, "You are not checked into any hotel", 400);
    }

    // Get the hotel ID
    const hotelId = client.current_hotel;

    // Construct the search query
    const searchQuery: any = {
      current_hotel: hotelId,
      _id: { $ne: client._id }, // Exclude the current user
    };

    // If a name is provided, add it to the search criteria
    if (name) {
      searchQuery.name = new RegExp(name as string, "i"); // Case-insensitive search
    }

    // Find clients matching the query
    const clients = await Client.find(searchQuery).populate({
      path: "profile",
      select: "name email phone", // Select specific fields from profile
    });

    // Format the response
    const people = clients.map((client: any) => ({
      name: client.name,
      email: client.profile?.email || "N/A",
      phone: client.profile?.phone || "N/A",
    }));

    return successResponse(
      res,
      "People in the same hotel retrieved successfully",
      { people }
    );
  } catch (error: any) {
    return errorResponse(res, error.message || "Server error", 500);
  }
};
export const getClientDetails = async (req: Request, res: Response) => {
  try {
    // Extract clientId from the request body
    const { clientId } = req.body;

    // Validate clientId
    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return errorResponse(res, "Invalid client ID", 400);
    }

    // Find the client by the clientId and populate the necessary fields
    const client: any = await Client.findById(clientId)
      .populate("profile", "email phone type") // Populating profile fields
      .populate("current_hotel", "name location position") // Populating current hotel fields
      .populate("visited_hotels", "name location position"); // Populating visited hotels fields

    if (!client) {
      return errorResponse(res, "Client not found", 404);
    }

    // Return the client details with profile, current hotel, and visited hotels information
    return successResponse(res, "Client details fetched successfully", {
      client: {
        name: client.name,
        current_hotel: client.current_hotel,
      },
      profile: {
        email: client.profile?.email,
        phone: client.profile?.phone,
        type: client.profile?.type,
      },
      visited_hotels: client.visited_hotels,
    });
  } catch (error: any) {
    return errorResponse(res, error.message || "Server error", 500);
  }
};
