import express from 'express';
import adminRouter from './admin_routes';
import settingsRouter from './settings_routes'
import clientRouter from "./client_routes"
import hotelRouter from './hotel_routes'
const router = express.Router();


router.use('/', adminRouter);
router.use('/', settingsRouter);
router.use('/',clientRouter)
router.use('/',hotelRouter)


export default router;