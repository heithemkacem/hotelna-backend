import { Request, Response } from 'express';
import {Hotel,Profile} from '../database/index';
import { successResponse,errorResponse } from '../utils';
import QRCode from 'qrcode';
import bcrypt from 'bcrypt';
import { generatePassword } from '../utils';
import { rabbitMQService } from '../services/RabbitMQService';
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

 
    const lastHotel = await Hotel.findOne().sort({ key: -1 }).select('key');
    const newKey = lastHotel ? lastHotel.key + 1 : 0;

   
    const qrCode = await QRCode.toDataURL(newKey.toString().padStart(4, '0'));


    const rawPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

 
    const hotelEmail = `${name.replace(/\s+/g, '').toLowerCase()}@example.com`;
    const hotelProfile = await Profile.create({
      email: hotelEmail,
      password: hashedPassword,
      type: 'hotel',
      isVerified: true,
    });


    const newHotel = await Hotel.create({
      profile: hotelProfile._id,
      name,
      description,
      price,
      key: newKey,
      images: images || [], 
    });


    await rabbitMQService.sendEmailNotification(
      hotelEmail,
      'Welcome to Our Platform',
      `Dear ${name},\n\nYour hotel account has been created successfully. Here are your credentials:\n\nEmail: ${hotelEmail}\nPassword: ${rawPassword}\n
      Best regards,\nYour Company`
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
