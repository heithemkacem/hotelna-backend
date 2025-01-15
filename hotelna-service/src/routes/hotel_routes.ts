import express from "express";
import { addExistingServiceToHotel, getHotelByCode, getHotelServices } from "../controllers/hotel-controller";


const router = express.Router();

// Route to get a hotel by its code
router.get("/hotels/:hotelCode", getHotelByCode);
router.put('/hotel/add-service',addExistingServiceToHotel)
router.post('/hotel/services',getHotelServices)
export default router;
