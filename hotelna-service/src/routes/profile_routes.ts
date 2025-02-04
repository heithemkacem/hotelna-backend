import express from "express";
import {
  addToken,
  changePassword,
  getProfile,
  updateProfile,
} from "../controllers/profiles.controller";
import { upload } from "../config/aws";
import { verifyToken } from "../middleware";

const router = express.Router();

//!Profile
router.get("/profile/:id", getProfile);
router.patch("/profile/:userId", updateProfile);
router.post("/add-token", verifyToken, addToken);
router.put("/change-password", verifyToken, changePassword);
export default router;
