import express from 'express';
import adminRouter from './admin_routes';


const router = express.Router();

// Mount individual route files
router.use('/admin', adminRouter);


export default router;