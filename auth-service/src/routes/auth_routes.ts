import { Router } from "express";
import AuthController from "../controllers/auth_controllers";
import OtpController from "../controllers/otp_controller";

const userRouter = Router();

userRouter.post("/register", AuthController.register as any);
userRouter.post("/login", AuthController.login as any);
//verify profile
userRouter.post('/validate', OtpController.validateOTP as any);
userRouter.post('/forget-password', OtpController.forgetPassword as any);
userRouter.post('/reset-password', OtpController.resetPassword as any);
//verifiy password request 
userRouter.post('/validate-reset-password', OtpController.validateResetPasswordOTP as any);
userRouter.post('/resend-otp', OtpController.resendOTP as any);

export default userRouter;
