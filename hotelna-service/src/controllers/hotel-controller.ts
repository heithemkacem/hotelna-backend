import { Request, Response } from "express";
import { Hotel, Service } from "../database";
import { errorResponse, successResponse } from "../utils";
import mongoose from "mongoose";
import { IService } from "../database/models/service/service";
import ServiceRequest from "../database/models/serive-request/service-request";


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

export const addExistingServiceToHotel = async (req: any, res: Response) => {
  try {
    const {  serviceKey } = req.body;
const  hotelId = req.user?.client.id
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


export const getHotelCoordinates = async (req: Request, res: Response) => {
  try {
    const { hotelId } = req.params;

    // Find the hotel by its ID
    const hotel = await Hotel.findById(hotelId).select("coordinates name");

    if (!hotel) {
      return errorResponse(res, "Hotel not found", 404);
    }

    // Return the hotel's coordinates
    return successResponse(res, "Hotel coordinates retrieved successfully", {
      hotelName: hotel.name,
      coordinates: hotel.coordinates,
    });
  } catch (error: any) {
    return errorResponse(res, error.message || "Server error", 500);
  }
}
export const getClientsInHotel = async (req: Request, res: Response) => {
  try {
    const { hotelId } = req.body;

   
    const hotel = await Hotel.findById(hotelId).populate({
      path: 'current_clients',
      populate: {
        path: 'profile', 
        select: 'name email phone', 
      },
    });

    if (!hotel) {
      return errorResponse(res, 'Hotel not found', 404);
    }

    // Extract clients with name, email, and phone
    const clients = hotel.current_clients.map((client: any) => ({
      name: client.name,
      email: client.profile?.email || 'N/A',
      phone: client.profile?.phone || 'N/A',
    }));

    return successResponse(res, 'Clients retrieved successfully', { clients });
  } catch (error: any) {
    return errorResponse(res, error.message || 'Server error', 500);
  }
};
export const getHotelServicesloggedIn = async (req: any, res: Response) => {
  try {
    // Retrieve the hotelId from req.user.client.id (as per your setup)
    const hotelId = req.user?.client.id;
     console.log(hotelId)
    // Find the hotel using the hotelId
    const hotel = await Hotel.findById(hotelId).populate('services.service');
    if (!hotel) {
      return errorResponse(res, "Hotel not found", 404);
    }

    // Return the services associated with the hotel
    return successResponse(res, "Hotel services fetched successfully", {
      services: hotel.services,
    });
  } catch (error: any) {
    return errorResponse(res, error.message || "Server error", 500);
  }
};
export const getAllServices = async (req: any, res: Response) => {
  try {
    // Retrieve the hotelId from req.user.client.id (as per your setup)
    const hotelId = req.user.client.id;
    
    // Extract pagination parameters from query string (defaults to page 1)
    const page = parseInt(req.query.page as string) || 1;
    const limit = 6; // Fixed 6 per page
    
    // Find the hotel using the hotelId
    const hotel = await Hotel.findById(hotelId).populate('services.service');
    if (!hotel) {
      return errorResponse(res, "Hotel not found", 404);
    }

    // Get the services associated with the hotel
    const hotelServices = hotel.services.map((serviceEntry: any) => serviceEntry.service.toString());

    // Find all services that are created by the admin and not already in the hotel
    const allServices = await Service.find({
      _id: { $nin: hotelServices } // Exclude services that are already assigned to the hotel
    })
    .skip((page - 1) * limit)  // Skip the previous pages
    .limit(limit) // Limit to 6 services per page

    // Total count of services (for pagination purposes)
    const totalServices = await Service.countDocuments({ _id: { $nin: hotelServices } });

    // Return the services with pagination info
    return successResponse(res, "Services fetched successfully", {
      services: allServices,
      pagination: {
        totalPages: Math.ceil(totalServices / limit),
        currentPage: page,
        totalServices
      }
    });
  } catch (error: any) {
    return errorResponse(res, error.message || "Server error", 500);
  }
};
export const updateServiceStatus = async (req: any, res: Response) => {
  try {
    // Extract the hotelId from req.user.client.id (as per your setup)
    const hotelId = req.user.client.id;
    
    // Extract service ID and the new status from the request body
    const { serviceId, status } = req.body;

    // Validate that the status is one of the allowed values
    const validStatuses = ['dispo', 'indispo', 'en maintenance'];
    if (!validStatuses.includes(status)) {
      return errorResponse(res, "Invalid status. Valid values are 'dispo', 'indispo', 'en maintenance'.", 400);
    }

    // Find the hotel by its ID
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      return errorResponse(res, "Hotel not found", 404);
    }

    // Check if the service is associated with the hotel
    const serviceIndex = hotel.services.findIndex((serviceEntry: any) => serviceEntry.service.toString() === serviceId);
    if (serviceIndex === -1) {
      return errorResponse(res, "Service not found in this hotel", 404);
    }

    // Update the status of the service in the hotel's services array
    hotel.services[serviceIndex].status = status;

    // Save the hotel document with the updated service status
    await hotel.save();

    // Respond with success
    return successResponse(res, "Service status updated successfully", { serviceId, status });
  } catch (error: any) {
    return errorResponse(res, error.message || "Server error", 500);
  }
};
export const deleteServiceFromHotel = async (req: any, res: Response) => {
  try {
    // Extract the hotelId from req.user.client.id (as per your setup)
    const hotelId = req.user.client.id;
    
    // Extract the service ID from the request parameters
    const { serviceId } = req.body;

    // Find the hotel by its ID
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      return errorResponse(res, "Hotel not found", 404);
    }

    // Find the index of the service to be deleted in the hotel's services array
    const serviceIndex = hotel.services.findIndex((serviceEntry: any) => serviceEntry.service.toString() === serviceId);
    
    // If the service is not found in the hotel, return an error
    if (serviceIndex === -1) {
      return errorResponse(res, "Service not found in this hotel", 404);
    }

    // Remove the service from the services array
    hotel.services.splice(serviceIndex, 1);

    // Save the updated hotel document
    await hotel.save();

    // Respond with success
    return successResponse(res, "Service deleted successfully");
  } catch (error: any) {
    return errorResponse(res, error.message || "Server error", 500);
  }
};
export const getServiceRequestsForHotel = async (req: any, res: Response) => {
  try {
    const hotelId = req.user.client.id; // Hotel ID from logged-in user
    const { status, page = 1 } = req.query; // Status filter and page number

    // Pagination configuration
    const limit = 6;
    const skip = (Number(page) - 1) * limit;

    // Build the filter
    const filter: any = { hotel: hotelId };
    if (status) {
      filter.status = status;
    }

    // Fetch service requests with pagination and filtering
    const serviceRequests = await ServiceRequest.find(filter)
      .populate("client", "name") // Populate client name
      .populate("service", "name") // Populate service name
      .sort({ createdAt: -1 }) // Sort by creation date (most recent first)
      .skip(skip)
      .limit(limit);

    // Count total documents matching the filter
    const totalRequests = await ServiceRequest.countDocuments(filter);

    // Prepare the response
    return successResponse(res, "Service requests fetched successfully", {
      requests: serviceRequests,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalRequests / limit),
        totalRequests,
      },
    });
  } catch (error: any) {
    return errorResponse(res, error.message || "Server error", 500);
  }
};
export const updateHotelPosition = async (req: any, res: Response) => {
  try {
    const hotelId = req.user.client.id; // Hotel ID from the logged-in user
    const { lat, long } = req.body; // Latitude and Longitude from the request body

    // Validation
    if (!lat || !long) {
      return errorResponse(res, "Latitude and Longitude are required", 400);
    }

    // Update the hotel position
    const updatedHotel = await Hotel.findByIdAndUpdate(
      hotelId,
      { "coordinates.lat": lat, "coordinates.long": long },
      { new: true } // Return the updated document
    );

    if (!updatedHotel) {
      return errorResponse(res, "Hotel not found", 404);
    }

    return successResponse(res, "Hotel position updated successfully", {
      hotel: {
        id: updatedHotel._id,
        name: updatedHotel.name,
        coordinates: updatedHotel.coordinates,
      },
    });
  } catch (error: any) {
    return errorResponse(res, error.message || "Server error", 500);
  }
};