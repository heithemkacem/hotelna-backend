import express from "express";
import {
  getHotels,
  createHotel,
  editHotelByKey,
  deleteHotelByKey,
  getAllClients,
  deleteClient,
  createService,
  editService,
  deleteService,
  blockUnblockProfile,
  getAllServices,
  getSingleService,
} from "../controllers/admin-controller";
import { upload } from "../config/aws";

const router = express.Router();
//!Hotels
router.get("/hotels", getHotels);
router.post("/hotel", upload.array("images"), createHotel);
router.put("/hotels/edit", editHotelByKey);
router.delete("/hotels/delete", deleteHotelByKey);
//!Clients
router.get("/clients", getAllClients);
router.patch("/client/block-unblock", blockUnblockProfile);
router.delete("/client/delete", deleteClient);
//!Services
router.get("/services", getAllServices);
router.get("/service/:id", getSingleService);
router.post("/services", createService);
router.put("/services", editService);
router.delete("/service", deleteService);
export default router;
