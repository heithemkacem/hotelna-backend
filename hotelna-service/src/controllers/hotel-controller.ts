import { Request, Response } from "express";
import { Hotel, Service } from "../database";
import { errorResponse, successResponse } from "../utils";
import mongoose from "mongoose";
import { IService } from "../database/models/service/service";


export const getHotelByCode = async (req: Request, res: Response) => {
  try {
    const { hotelCode } = req.params;

    // Find the hotel by its unique key
    const hotel = await Hotel.findOne({ key: hotelCode }).populate("current_clients", "name email"); // Example: populate clients' details

    if (!hotel) {
      return errorResponse(res, "Hotel not found", 404);
    }

    return successResponse(res, "Hotel retrieved successfully", { hotel });
  } catch (error: any) {
    return errorResponse(res, error.message || "Server error", 500);
  }
};

export const addExistingServiceToHotel = async (req: Request, res: Response) => {
  try {
    const { hotelId, serviceKey } = req.body;

    // Find the hotel
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      return errorResponse(res, "Hotel not found", 404);
    }

    // Find the service by key
    const service = await Service.findOne({ key: serviceKey });
    if (!service) {
      return errorResponse(res, "Service not found", 404);
    }

    // Check if the service is already added to the hotel
    const isServiceAdded = hotel.services.some(
      (entry: any) => entry?.service?.toString() === service._id.toString()
    );
    if (isServiceAdded) {
      return errorResponse(res, "Service already added to the hotel", 400);
    }

    // Add the service to the hotel's services array with default status "dispo"
    hotel.services.push({ service: service._id, status: "dispo" });

    // Save the updated hotel
    await hotel.save();

    return successResponse(res, "Service added to hotel successfully", {
      hotel,
      addedService: { service: service._id, status: "dispo" },
    });
  } catch (error: any) {
    return errorResponse(res, error.message || "Server error", 500);
  }
};
export const getHotelServices = async (req: Request, res: Response) => {
  try {
    const { hotelKey } = req.body;

    // Find the hotel by its unique key and populate the 'service' field inside the 'services' array
    const hotel = await Hotel.findOne({ key: hotelKey }).populate({
      path: "services.service", // Populate the 'service' field inside the 'services' array
      select: "name description", // Select only 'name' and 'description' from the Service model
    });

    if (!hotel) {
      return errorResponse(res, "Hotel not found", 404);
    }

    // Check the structure of the populated services array
    if (!hotel.services || hotel.services.length === 0) {
      return errorResponse(res, "No services found for this hotel", 404);
    }

    // Map over the populated services array and return the name, description, and status
    const services = hotel.services
    .filter((entry: any) => entry.status === 'dispo')
    .map((entry: any) => ({
      name: entry.service?.name, // Safe access in case service is undefined
      description: entry.service?.description, // Safe access
      status: entry.status,
    }));

    // Return the services
    return successResponse(res, "Services retrieved successfully", { services });
  } catch (error: any) {
    return errorResponse(res, error.message || "Server error", 500);
  }
};