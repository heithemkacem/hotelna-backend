import express from 'express';
import { getHotels,createHotel, editHotelByKey, deleteHotelByKey,  getAllClients, deleteClient, createService,
    editService,
    deleteService,
    blockUnblockProfile, } from '../controllers/admin-controller';
import { validateRequest } from '../middleware';
import { createHotelSchema } from '../validators/hotel.dto';


const router = express.Router();

router.get('/hotels', getHotels);
router.post('/hotel',validateRequest(createHotelSchema),createHotel)
router.put('/hotels/edit', editHotelByKey); 
router.delete('/hotels/delete', deleteHotelByKey);
// router.patch('/hotels/block', toggleBlockHotelByKey);
router.get('/clients', getAllClients);
router.patch('/client/block-unblock',blockUnblockProfile)
router.delete('/client/delete',deleteClient)
router.post('/services', createService);


router.put('/services/', editService);


router.delete('/services/', deleteService);

export default router;
