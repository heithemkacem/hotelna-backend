import { Router } from "express";
import AuthController from "../controllers/auth_controllers";
import OtpController from "../controllers/otp_controller";

const userRouter = Router();

userRouter.post("/register", AuthController.register as any);
userRouter.post("/login", AuthController.login as any);
userRouter.post("/google", AuthController.loginGoogle as any);
userRouter.post("/facebook", AuthController.loginFB as any);
//verify profile
userRouter.post("/validate", OtpController.validateOTP as any);
//resend otp
userRouter.post("/resend-email-otp", OtpController.resendOTP as any);
userRouter.post("/forget-password", OtpController.forgetPassword as any);
userRouter.post("/reset-password", OtpController.resetPassword as any);
//verifiy password request
userRouter.post(
  "/validate-reset-password",
  OtpController.validateResetPasswordOTP as any
);
userRouter.post("/send-phone-otp", OtpController.sendPhoneOTP as any);
userRouter.post("/verify-phone-otp", OtpController.verifyPhoneOTP as any);
export default userRouter;
