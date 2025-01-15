import express from 'express';
import { updateSettings } from '../controllers/settings-contrller';
import { verifyToken } from '../middleware';
const router = express.Router();
router.put('/settings/update',verifyToken, updateSettings);


export default router;
