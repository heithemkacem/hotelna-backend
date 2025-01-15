import { Request, Response } from 'express';
import {Client, Hotel,Profile, Settings} from '../database/index';
import { successResponse,errorResponse } from '../utils';
import QRCode from 'qrcode';
import bcrypt from 'bcrypt';
import { generatePassword } from '../utils';
import { rabbitMQService } from '../services/RabbitMQService';
import {Service} from '../database/index';
export const getHotels = async (req: Request, res: Response) => {
  try {
    const { page = 1, search = '', showBlocked, minRating, minPrice, maxPrice } = req.query;

    const filters: any = {};

   
    if (search) {
      filters.name = { $regex: search, $options: 'i' };
    }

    
    if (showBlocked !== undefined) {
      filters.blocked = showBlocked === 'true';
    }

    
    if (minRating) {
      filters.rating = { $gte: Number(minRating) };
    }

   
    if (minPrice || maxPrice) {
      filters.price = {};
      if (minPrice) filters.price.$gte = Number(minPrice);
      if (maxPrice) filters.price.$lte = Number(maxPrice);
    }

  
    const limit = 6;
    const skip = (Number(page) - 1) * limit;

   
    const hotels = await Hotel.find(filters)
      .skip(skip)
      .limit(limit);

   
    const total = await Hotel.countDocuments(filters);

    return successResponse(res, 'Hotels retrieved successfully', {
        hotels,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: Number(page),
      });
  
  } catch (error) {
    console.error('Error retrieving hotels:', error);
    return errorResponse(res, 'Error retrieving hotels', 500);
  }
};






export const createHotel = async (req: Request, res: Response) => {
  try {
    const { name, description, price, images } = req.body;

    if (!name || !description || !price) {
      return errorResponse(res, 'Name, description, and price are required.');
    }

    if (images && (!Array.isArray(images) || images.length > 6)) {
      return errorResponse(
        res,
        'Images must be an array with a maximum of 6 URLs.'
      );
    }

    // Initialize the key variable
    let newKey = '';
    let isUnique = false;

    // Generate a unique random 4-digit key
    while (!isUnique) {
      const potentialKey = Math.floor(Math.random() * 9000 + 1000).toString(); // Random 4-digit number
      const existingHotel = await Hotel.findOne({ key: potentialKey });
      if (!existingHotel) {
        isUnique = true;
        newKey = potentialKey; // Assign the unique key
      }
    }

    // Generate a QR code containing the key
    const qrCode = await QRCode.toDataURL(newKey);

    // Generate a password for the hotel profile
    const rawPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    // Create a unique email for the hotel
    const hotelEmail = `${name.replace(/\s+/g, '').toLowerCase()}@example.com`;
    const hotelProfile = await Profile.create({
      email: hotelEmail,
      password: hashedPassword,
      type: 'hotel',
      isVerified: true,
    });

    // Create settings for the hotel profile
    await Settings.create({
      user: hotelProfile._id,
      userType: 'Hotel',
      notification: true,
      emailNotification: true,
      bookingUpdate: true,
      newMessage: true,
      marketing: true,
    });

    // Create the new hotel document
    const newHotel = await Hotel.create({
      profile: hotelProfile._id,
      name,
      description,
      price,
      key: newKey,
      images: images || [],
    });

    // Send the email notification using RabbitMQ
    await rabbitMQService.sendEmailNotification(
      hotelEmail,
      'Welcome to Our Platform',
      `Dear ${name},\n\nYour hotel account has been created successfully. Here are your credentials:\n\nEmail: ${hotelEmail}\nPassword: ${rawPassword}\n\nBest regards,\nYour Company`
    );

    return successResponse(res, 'Hotel created successfully', {
      hotel: newHotel,
      qrCode,
    });
  } catch (error) {
    console.error('Error creating hotel:', error);
    return errorResponse(res, 'Failed to create hotel', 500);
  }
};

// Edit Hotel
export const editHotelByKey = async (req: Request, res: Response) => {
  try {
    const { key } = req.body;
    const updates = req.body;

    if (!key) {
      return errorResponse(res, 'Hotel key is required.', 400);
    }

    const updatedHotel = await Hotel.findOneAndUpdate(
      { key },
      updates,
      { new: true }
    );

    if (!updatedHotel) {
      return errorResponse(res, 'Hotel not found', 404);
    }

    return successResponse(res, 'Hotel updated successfully', updatedHotel);
  } catch (error) {
    console.error('Error updating hotel:', error);
    return errorResponse(res, 'Failed to update hotel', 500);
  }
};

// Delete Hotel
export const deleteHotelByKey = async (req: Request, res: Response) => {
  try {
    const { key } = req.body;

    if (!key) {
      return errorResponse(res, 'Hotel key is required.', 400);
    }

    const deletedHotel = await Hotel.findOneAndDelete({ key });

    if (!deletedHotel) {
      return errorResponse(res, 'Hotel not found', 404);
    }

    return successResponse(res, 'Hotel deleted successfully');
  } catch (error) {
    console.error('Error deleting hotel:', error);
    return errorResponse(res, 'Failed to delete hotel', 500);
  }
};

// Block/Unblock Hotel
export const toggleBlockHotelByKey = async (req: Request, res: Response) => {
  try {
    const { key } = req.body;

    if (!key) {
      return errorResponse(res, 'Hotel key is required.', 400);
    }

    const hotel = await Hotel.findOne({ key });

    if (!hotel) {
      return errorResponse(res, 'Hotel not found', 404);
    }

    hotel.blocked = !hotel.blocked;
    await hotel.save();

    const status = hotel.blocked ? 'blocked' : 'unblocked';
    return successResponse(res, `Hotel successfully ${status}`);
  } catch (error) {
    console.error('Error toggling block status:', error);
    return errorResponse(res, 'Failed to toggle block status', 500);
  }
};
export const getAllClients = async (req: any, res: any) => {
  try {
    const { name, email, page = 1, limit = 10 } = req.query;

   
    const query: any = {};

    if (name) {
      query.name = { $regex: name, $options: 'i' }; 
    }
    if (email) {
    
      const profiles = await Profile.find({ email: { $regex: email, $options: 'i' } });
      const profileIds = profiles.map(profile => profile._id);
      query.profile = { $in: profileIds }; 
    }

    const skip = (Number(page) - 1) * Number(limit);
    const clients = await Client.find(query)
      .populate("profile", "email") 
      .skip(skip)
      .limit(Number(limit));

    const totalRecords = await Client.countDocuments(query);
    const totalPages = Math.ceil(totalRecords / Number(limit));

    return res.status(200).json({
      ok: true,
      status: "Success",
      message: "Clients retrieved successfully",
      data: {
        clients,
        pagination: {
          currentPage: Number(page),
          totalPages,
          totalRecords,
        },
      },
    });
  } catch (error) {
    console.error('Error searching clients:', error);
    return res.status(500).json({
      ok: false,
      status: "Error",
      message: "Error retrieving clients",
    });
  }

};
export const blockUnblockClient = async (req: any, res: any) => {
  try {
    const { clientId } = req.body; // Get client ID from the request body

    // Find the client by ID
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({
        ok: false,
        status: 'Error',
        message: 'Client not found.',
      });
    }

    // Toggle the blocked status
    client.blocked = !client.blocked; // Toggle the blocked status
    await client.save();

    return res.status(200).json({
      ok: true,
      status: 'Success',
      message: `Client has been ${client.blocked ? 'blocked' : 'unblocked'} successfully.`,
      data: { client },
    });
  } catch (error) {
    console.error('Error blocking/unblocking client:', error);
    return res.status(500).json({
      ok: false,
      status: 'Error',
      message: 'Failed to block/unblock client.',
    });
  }
};
export const deleteClient = async (req: any, res: any) => {
  try {
    const { clientId } = req.body; 
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({
        ok: false,
        status: 'Error',
        message: 'Client not found.',
      });
    }

    
    const profile = await Profile.findById(client.profile);
    if (profile) {
      await Profile.deleteOne({ _id: profile._id });
    }

  
    await Client.deleteOne({ _id: clientId });

    return res.status(200).json({
      ok: true,
      status: 'Success',
      message: 'Client and related profile have been deleted successfully.',
    });
  } catch (error) {
    console.error('Error deleting client and profile:', error);
    return res.status(500).json({
      ok: false,
      status: 'Error',
      message: 'Failed to delete client and profile.',
    });
  }
};
export const createService = async (req: any, res: any) => {
  try {
    const { name, description } = req.body;

    if (!name || !description) {
      return res.status(400).json({
        ok: false,
        status: 'Error',
        message: 'Name and description are required.',
      });
    }

    const newService = new Service({ name, description });
    await newService.save();

    return res.status(201).json({
      ok: true,
      status: 'Success',
      message: 'Service created successfully.',
      data: newService,
    });
  } catch (error) {
    console.error('Error creating service:', error);
    return res.status(500).json({
      ok: false,
      status: 'Error',
      message: 'Failed to create service.',
    });
  }
};

// Edit an existing service
export const editService = async (req: any, res: any) => {
  try {
    const { name, description,serviceId } = req.body;

    if (!name || !description) {
      return res.status(400).json({
        ok: false,
        status: 'Error',
        message: 'Name and description are required.',
      });
    }

    const service = await Service.findByIdAndUpdate(
      serviceId,
      { name, description },
      { new: true } // Return the updated service
    );

    if (!service) {
      return res.status(404).json({
        ok: false,
        status: 'Error',
        message: 'Service not found.',
      });
    }

    return res.status(200).json({
      ok: true,
      status: 'Success',
      message: 'Service updated successfully.',
      data: service,
    });
  } catch (error) {
    console.error('Error editing service:', error);
    return res.status(500).json({
      ok: false,
      status: 'Error',
      message: 'Failed to edit service.',
    });
  }
};

// Delete a service
export const deleteService = async (req: any, res: any) => {
  try {
    const { serviceId } = req.body;

    const service = await Service.findByIdAndDelete(serviceId);

    if (!service) {
      return res.status(404).json({
        ok: false,
        status: 'Error',
        message: 'Service not found.',
      });
    }

    return res.status(200).json({
      ok: true,
      status: 'Success',
      message: 'Service deleted successfully.',
    });
  } catch (error) {
    console.error('Error deleting service:', error);
    return res.status(500).json({
      ok: false,
      status: 'Error',
      message: 'Failed to delete service.',
    });
  }
};