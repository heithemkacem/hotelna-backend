import express from 'express';
import adminRouter from './admin_routes';


const router = express.Router();


router.use('/', adminRouter);


export default router;