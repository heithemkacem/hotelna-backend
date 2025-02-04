import express from "express";
import profileRouter from "./profile_routes";
import adminRouter from "./admin_routes";
import clientRouter from "./client_routes";
import hotelRouter from "./hotel_routes";
const router = express.Router();

router.use("/", profileRouter);
router.use("/", adminRouter);
router.use("/", clientRouter);
router.use("/", hotelRouter);

export default router;
