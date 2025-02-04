import { Router } from "express";
import { validateRequest, verifyToken } from "../middleware";

import { requestServiceSchema } from "../validators/service.dto";
import {
  enterHotel,
  getClientDetails,
  requestService,
  searchPeopleInSameHotel,
  viewLoginHistory,
} from "../controllers/client-controller";

const router = Router();

router.get("/view-login-history", verifyToken, viewLoginHistory);
router.post("/enter-hotel", verifyToken, enterHotel);
router.post(
  "/service-request",
  verifyToken,
  validateRequest(requestServiceSchema),
  requestService
);
router.get("/clients/same-hotel", verifyToken, searchPeopleInSameHotel);
router.post("/client-deltails", getClientDetails);

export default router;
