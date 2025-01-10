import { Request, Response } from 'express';
import {Hotel} from '../database/index';
import { successResponse,errorResponse } from '../utils';
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
