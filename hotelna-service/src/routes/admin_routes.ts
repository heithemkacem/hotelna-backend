import express from 'express';
import { getHotels,createHotel } from '../controllers/admin-controller';

const router = express.Router();

router.get('/hotels', getHotels);
router.post('/hotel',createHotel)

export default router;
