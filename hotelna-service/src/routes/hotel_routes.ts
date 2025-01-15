import express from "express";
import { addExistingServiceToHotel, deleteServiceFromHotel, getClientsInHotel, getHotelByCode, getHotelCoordinates, getHotelServices, getHotelServicesloggedIn, getServiceRequestsForHotel, updateHotelPosition, updateServiceStatus } from "../controllers/hotel-controller";
import { verifyToken } from "../middleware";



const router = express.Router();

// Route to get a hotel by its code
router.get("/hotels/:hotelCode", getHotelByCode);
router.put('/hotel/add-service',verifyToken,addExistingServiceToHotel)
router.post('/hotel/services',getHotelServices)
export default router;
router.get("/hotel/coordinates/:hotelId", getHotelCoordinates);
router.post("/hotel/clients",getClientsInHotel)
router.get("/hotel/services/logged-in",verifyToken,getHotelServicesloggedIn)
router.post('/services/update-status',verifyToken,updateServiceStatus)
router.delete('/unactif-service',verifyToken,deleteServiceFromHotel)
router.get("/hotel/serices-requests",verifyToken,getServiceRequestsForHotel)
router.post('/hotel/udpate-position',verifyToken,updateHotelPosition)
