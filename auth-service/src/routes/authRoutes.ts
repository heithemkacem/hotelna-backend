import { Router } from "express";
import AuthController from "../controllers/AuthController";

const userRouter = Router();

userRouter.post("/register", AuthController.register as any);
userRouter.post("/login", AuthController.login as any);

export default userRouter;
