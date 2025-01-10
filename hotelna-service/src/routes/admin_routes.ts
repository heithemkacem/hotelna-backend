import express from 'express';
import { getHotels } from '../controllers/admin-controller';

const router = express.Router();

router.get('/hotels', getHotels);

export default router;
