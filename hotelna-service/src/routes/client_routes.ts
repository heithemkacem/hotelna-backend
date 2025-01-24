import { Router } from "express";
import { validateRequest, verifyToken } from "../middleware";
import userController, {
  addToken,
  requestService,
  searchPeopleInSameHotel,
} from "../controllers/client-controller";
import { requestServiceSchema } from "../validators/service.dto";

const router = Router();

router.put("/change-password", verifyToken, userController.changePassword);
router.get("/view-login-history", verifyToken, userController.viewLoginHistory);
router.post("/enter-hotel", verifyToken, userController.enterHotel);
router.post(
  "/service-request",
  verifyToken,
  validateRequest(requestServiceSchema),
  requestService
);
router.get("/clients/same-hotel", verifyToken, searchPeopleInSameHotel);
router.post("/client-deltails", userController.getClientDetails);
router.post("/add-token", verifyToken, addToken);

export default router;
