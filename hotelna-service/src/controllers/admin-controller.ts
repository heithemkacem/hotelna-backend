import { Request, Response } from "express";
import {
  Admin,
  Client,
  IAdmin,
  Hotel,
  IProfile,
  Profile,
  Settings,
  IHotel,
  IClient,
} from "../database/index";
import { successResponse, errorResponse } from "../utils";
import QRCode from "qrcode";
import bcrypt from "bcrypt";
import { generatePassword } from "../utils";
import { rabbitMQService } from "../services/RabbitMQService";
import { Service } from "../database/index";
import ArchivedHotel from "../database/models/archive/archive";
import config from "../config/config";
import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "../config/aws";
import ImageModel from "../database/models/images/Images";
import mongoose from "mongoose";
export const getHotels = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      search = "",
      showBlocked,
      minRating,
      minPrice,
      maxPrice,
    } = req.query;

    const filters: any = {};

    if (search) {
      filters.name = { $regex: search, $options: "i" };
    }

    if (showBlocked !== undefined) {
      filters.blocked = showBlocked === "true";
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

    const hotels = await Hotel.find(filters).skip(skip).limit(limit);

    const total = await Hotel.countDocuments(filters);

    return successResponse(res, "Hotels retrieved successfully", {
      hotels,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
    });
  } catch (error) {
    console.error("Error retrieving hotels:", error);
    return errorResponse(res, "Error retrieving hotels", 500);
  }
};

export const createHotel = async (req: Request, res: Response) => {
  console.log(req.body);
  console.log(req.files);
  if (!req.files || !Array.isArray(req.files)) {
    return errorResponse(res, "No files uploaded", 400);
  }
  let hotelProfile: any = null;
  let newHotel: any = null;
  const bucketName = config.AWS_ACCESS_POINT;

  try {
    const files = req.files as any;
    console.log(files);
    const { name, email, description, phone, website, rating, location } =
      req.body;
    const position = JSON.parse(req.body.position);
    // Generate unique key
    let newKey = "";
    let isUnique = false;
    while (!isUnique) {
      const potentialKey = Math.floor(Math.random() * 9000 + 1000).toString();
      const existingHotel = await Hotel.findOne({ key: potentialKey });
      if (!existingHotel) {
        isUnique = true;
        newKey = potentialKey;
      }
    }

    // Create QR code
    const qrCode = await QRCode.toDataURL(newKey);

    // Create hotel profile
    const rawPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    hotelProfile = await Profile.create({
      email,
      name,
      password: hashedPassword,
      type: "hotel",
      isVerified: true,
      source: "app",
    });

    // Create hotel document
    newHotel = await Hotel.create({
      profile: hotelProfile._id,
      key: newKey,
      qrCode,
      name,
      email,
      description,
      phone,
      website,
      rating,
      location,
      position,
    });

    // Process image uploads with rollback capability
    const uploadPromises = files.map(async (file: any) => {
      let key;
      try {
        key = `images/${Date.now()}-${file.originalname}`;
        const params = {
          Bucket: bucketName,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          ACL: "public-read",
        } as any;

        await s3Client.send(new PutObjectCommand(params));
        const publicUrl = `https://d18l8bvwzu4ft2.cloudfront.net/${key}`;

        const image = await ImageModel.create({
          url: publicUrl,
          name: file.originalname,
          size: file.size,
          key,
          mimetype: file.mimetype,
          hotel: newHotel._id,
        });

        return { image, key };
      } catch (error) {
        // Cleanup uploaded S3 object if it was created
        if (key) {
          await s3Client
            .send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }))
            .catch((e) => console.error("S3 cleanup failed:", e));
        }
        throw error;
      }
    });

    // Handle image upload results
    const results = await Promise.allSettled(uploadPromises);
    const failedUploads = results.filter((r) => r.status === "rejected");

    if (failedUploads.length > 0) {
      // Cleanup successful uploads
      const successfulUploads = results
        .filter(
          (r): r is PromiseFulfilledResult<any> => r.status === "fulfilled"
        )
        .map((r) => r.value);

      for (const { image, key } of successfulUploads) {
        await ImageModel.findByIdAndDelete(image._id);
        await s3Client
          .send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }))
          .catch((e) => console.error("S3 cleanup failed:", e));
      }

      throw new Error("Some image uploads failed");
    }

    // Attach images to hotel
    const successfulImages = results.map(
      (r: any) => (r as PromiseFulfilledResult<any>).value.image
    );
    newHotel.images.push(...successfulImages.map((img: any) => img._id));
    await newHotel.save();

    // Send welcome email
    await rabbitMQService.sendEmailNotification(
      email,
      "Welcome to Our Platform",
      `Dear ${name},\n\nYour hotel account has been created successfully.\nEmail: ${email}\nPassword: ${rawPassword}`
    );

    return successResponse(res, "Hotel created successfully", {
      hotel: newHotel,
      qrCode,
    });
  } catch (error: any) {
    console.error("Error creating hotel:", error);

    // Cleanup resources in reverse creation order
    const cleanupActions = [];

    if (newHotel) {
      // Delete associated images
      const images = await ImageModel.find({ hotel: newHotel._id });
      for (const image of images) {
        cleanupActions.push(
          ImageModel.findByIdAndDelete(image._id),
          s3Client
            .send(
              new DeleteObjectCommand({ Bucket: bucketName, Key: image.key })
            )
            .catch((e) => console.error("S3 cleanup failed:", e))
        );
      }

      cleanupActions.push(Hotel.findByIdAndDelete(newHotel._id));
    }

    if (hotelProfile) {
      cleanupActions.push(Profile.findByIdAndDelete(hotelProfile._id));
    }

    // Execute all cleanup actions
    await Promise.all(cleanupActions);

    return errorResponse(res, "Failed to create hotel: " + error.message, 500);
  }
};
// Edit Hotel
export const editHotelByKey = async (req: Request, res: Response) => {
  try {
    const { key } = req.body;
    const updates = req.body;

    if (!key) {
      return errorResponse(res, "Hotel key is required.", 400);
    }

    const updatedHotel = await Hotel.findOneAndUpdate({ key }, updates, {
      new: true,
    });

    if (!updatedHotel) {
      return errorResponse(res, "Hotel not found", 404);
    }

    return successResponse(res, "Hotel updated successfully", updatedHotel);
  } catch (error) {
    console.error("Error updating hotel:", error);
    return errorResponse(res, "Failed to update hotel", 500);
  }
};

// Delete Hotel
export const deleteHotelByKey = async (req: Request, res: Response) => {
  try {
    const { hotelId } = req.body;
    if (!hotelId) {
      return errorResponse(res, "Hotel ID is required.", 400);
    }
    // Find the hotel by ID
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      return errorResponse(res, "Hotel not found.", 404);
    }
    // Archive the hotel by copying its data to the ArchivedHotel collection
    await ArchivedHotel.create({
      profile: hotel.profile,
      name: hotel.name,
      description: hotel.description,
      location: hotel.location,
      position: hotel.position,
      stars: 0,
      sponsored: hotel.sponsored,
      services: hotel.services,
      blocked: hotel.blocked,
      rating: hotel.rating,
      price: hotel.price,
      images: hotel.images,
      key: hotel.key,
      archivedAt: new Date(),
    });
    // Delete the hotel
    await hotel.deleteOne();
    return successResponse(res, "Hotel archived and deleted successfully.");
  } catch (error) {
    console.error("Error deleting hotel:", error);
    return errorResponse(res, "Failed to delete hotel.", 500);
  }
};

// Block/Unblock Hotel
// export const toggleBlockHotelByKey = async (req: Request, res: Response) => {
//   try {
//     const { key } = req.body;

//     if (!key) {
//       return errorResponse(res, 'Hotel key is required.', 400);
//     }

//     const hotel = await Hotel.findOne({ key });

//     if (!hotel) {
//       return errorResponse(res, 'Hotel not found', 404);
//     }

//     hotel.blocked = !hotel.blocked;
//     await hotel.save();

//     const status = hotel.blocked ? 'blocked' : 'unblocked';
//     return successResponse(res, `Hotel successfully ${status}`);
//   } catch (error) {
//     console.error('Error toggling block status:', error);
//     return errorResponse(res, 'Failed to toggle block status', 500);
//   }
// };
export const getAllClients = async (req: any, res: any) => {
  try {
    const { search, page = 1, limit = 4 } = req.query;
    const query: any = { type: "client" };

    // Combined search for name OR email
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    // Single query with combined search
    const [clients, totalRecords] = await Promise.all([
      Profile.find(query)
        .select("_id name email blocked createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Profile.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalRecords / Number(limit));
    console.log({
      ok: true,
      status: "Success",
      message: "Clients retrieved successfully",
      data: {
        clients,
        pagination: {
          currentPage: Number(page),
          totalPages,
          totalRecords,
          hasNextPage: Number(page) < totalPages,
        },
      },
    });
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
          hasNextPage: Number(page) < totalPages,
        },
      },
    });
  } catch (error) {
    console.error("Error searching clients:", error);
    return res.status(500).json({
      ok: false,
      status: "Error",
      message: "Error retrieving clients",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};

export const blockUnblockProfile = async (req: any, res: any) => {
  try {
    const { profileId, action } = req.body; // Action can be "block" or "unblock"

    if (!profileId || !action || !["block", "unblock"].includes(action)) {
      return res.status(400).json({ message: "Invalid parameters." });
    }

    // Find the profile by ID
    const profile = await Profile.findById(profileId);
    if (!profile) {
      return res.status(404).json({ message: "Profile not found." });
    }

    // Block or Unblock the profile
    profile.blocked = action === "block" ? true : false;
    await profile.save();

    return res
      .status(200)
      .json({ message: `Profile ${action}ed successfully.` });
  } catch (error) {
    console.error("Error blocking/unblocking profile:", error);
    return res
      .status(500)
      .json({ message: "Failed to block/unblock profile." });
  }
};
export const deleteClient = async (req: any, res: any) => {
  try {
    const { clientId } = req.body;
    const client = await Profile.findById(clientId);
    if (!client) {
      return res.status(404).json({
        ok: false,
        status: "Error",
        message: "Client not found.",
      });
    }

    const profile = (await Client.findById(client.user_id)) as any;
    if (profile) {
      if (profile.current_hotel) {
        const hotel = (await Hotel.findById(profile.current_hotel)) as IHotel;
        hotel.current_clients = hotel.current_clients.filter(
          (clientId) => clientId.toString() !== profile._id.toString()
        );
        hotel.save();
      }
      await Client.deleteOne({ _id: profile._id });
    }
    await Profile.deleteOne({ _id: clientId });

    return res.status(200).json({
      ok: true,
      status: "Success",
      message: "Client and related profile have been deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting client and profile:", error);
    return res.status(500).json({
      ok: false,
      status: "Error",
      message: "Failed to delete client and profile.",
    });
  }
};
export const createService = async (req: any, res: any) => {
  try {
    const { name, description, key } = req.body;

    // Validate required fields
    if (!name || !description || !key) {
      return res.status(400).json({
        ok: false,
        status: "Error",
        message: "Name, description, and key are required.",
      });
    }

    // Check for existing service with the same key
    const existingService = await Service.findOne({ key });
    if (existingService) {
      return res.status(400).json({
        ok: false,
        status: "Error",
        message: "Service key already exists.",
      });
    }

    // Create and save new service
    const newService = new Service({ name, description, key });
    await newService.save();

    return res.status(201).json({
      ok: true,
      status: "Success",
      message: "Service created successfully.",
      data: newService,
    });
  } catch (error) {
    console.error("Error creating service:", error);
    return res.status(500).json({
      ok: false,
      status: "Error",
      message: "Failed to create service.",
    });
  }
};
export const editService = async (req: any, res: any) => {
  try {
    const { name, description, serviceId, key } = req.body;

    // Validate required fields
    if (!name || !description || !serviceId || !key) {
      return res.status(400).json({
        ok: false,
        status: "Error",
        message: "All fields (name, description, serviceId, key) are required.",
      });
    }

    // Check if service exists
    const existingService = await Service.findById(serviceId);
    if (!existingService) {
      return res.status(404).json({
        ok: false,
        status: "Error",
        message: "Service not found.",
      });
    }

    // Key change validation
    if (key !== existingService.key) {
      // Check for duplicate key in other services
      const duplicateService = await Service.findOne({
        key: key,
        _id: { $ne: serviceId }, // Exclude current service
      });

      if (duplicateService) {
        return res.status(409).json({
          ok: false,
          status: "Error",
          message: "Service key already exists. Please use a unique key.",
        });
      }
    }

    // Update the service
    const updatedService = await Service.findByIdAndUpdate(
      serviceId,
      { name, description, key },
      { new: true }
    );

    return res.status(200).json({
      ok: true,
      status: "Success",
      message: "Service updated successfully.",
      data: updatedService,
    });
  } catch (error) {
    console.error("Error editing service:", error);
    return res.status(500).json({
      ok: false,
      status: "Error",
      message: "Internal server error while updating service.",
    });
  }
};

export const getAllServices = async (req: any, res: any) => {
  try {
    const { search, page = 1, limit = 4 } = req.query;
    const query: any = {};

    // Combined search for name OR email
    if (search) {
      query.$or = [
        { key: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    // Single query with combined search
    const [services, totalRecords] = await Promise.all([
      Service.find(query)
        .select("_id name description key createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Service.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalRecords / Number(limit));

    return res.status(200).json({
      ok: true,
      status: "Success",
      message: "Clients retrieved successfully",
      data: {
        services,
        pagination: {
          currentPage: Number(page),
          totalPages,
          totalRecords,
          hasNextPage: Number(page) < totalPages,
        },
      },
    });
  } catch (error) {
    console.error("Error searching clients:", error);
    return res.status(500).json({
      ok: false,
      status: "Error",
      message: "Error retrieving clients",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};

export const getSingleService = async (req: any, res: any) => {
  try {
    const { id } = req.params;

    // Validate ID format
    if (!id) {
      return res.status(400).json({
        ok: false,
        status: "Bad Request",
        message: "Invalid service ID ",
      });
    }

    // Find service by ID with selected fields
    const service = await Service.findById(id)
      .select("_id name description key createdAt")
      .lean();

    if (!service) {
      return res.status(404).json({
        ok: false,
        status: "Not Found",
        message: "Service not found",
      });
    }

    return res.status(200).json({
      ok: true,
      status: "Success",
      message: "Service retrieved successfully",
      data: service,
    });
  } catch (error) {
    console.error("Error retrieving service:", error);
    return res.status(500).json({
      ok: false,
      status: "Error",
      message: "Error retrieving service",
      error: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
};
// Delete a service
export const deleteService = async (req: any, res: any) => {
  try {
    const { serviceId } = req.body;
    console.log(serviceId);
    const service = await Service.findByIdAndDelete(serviceId);

    if (!service) {
      return res.status(404).json({
        ok: false,
        status: "Error",
        message: "Service not found.",
      });
    }

    return res.status(200).json({
      ok: true,
      status: "Success",
      message: "Service deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting service:", error);
    return res.status(500).json({
      ok: false,
      status: "Error",
      message: "Failed to delete service.",
    });
  }
};
export const createAdminUser = async () => {
  try {
    const adminEmail = "admin@hotelna.com"; // Change this to your desired admin email
    const adminPassword = "Hh123456789@"; // Change this to your desired admin password

    // Check if an admin user already exists
    const existingAdmin = await Profile.findOne({ role: "admin" });
    if (existingAdmin) {
      console.log("Admin user already exists.");
      return;
    }

    // Hash the admin password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create the admin user
    const profile: IProfile = new Profile({
      email: adminEmail,
      password: hashedPassword,
      type: "admin",
      isVerified: true,
      phone: "+21625711161",
      isPhoneVerified: true,
      source: "BACKEND",
      name: "Hotelna Admin",
    });
    await profile.save();
    const admin: IAdmin = new Admin({
      profile: profile._id,
    });
    await admin.save();
    profile.user_id = admin._id as any;
    admin.save();
    console.log("Admin user created successfully.");
  } catch (error) {
    console.error("Error creating admin user:", error);
  }
};
