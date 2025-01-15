import { Router } from "express";
import { verifyToken } from "../middleware";
import userController, { requestService, searchPeopleInSameHotel } from "../controllers/client-controller";

const router = Router();

router.put("/change-password", verifyToken, userController.changePassword);
router.get("/view-login-history", verifyToken, userController.viewLoginHistory);
router.post("/enter-hotel", verifyToken, userController.enterHotel);
router.post('/service-request',verifyToken,requestService)
router.get('/clients/same-hotel',verifyToken,searchPeopleInSameHotel)
router.post('/client-deltails',userController.getClientDetails)

export default router;