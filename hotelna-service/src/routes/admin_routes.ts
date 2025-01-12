import express from 'express';
import { getHotels,createHotel, editHotelByKey, deleteHotelByKey, toggleBlockHotelByKey, getAllClients, blockUnblockClient, deleteClient, createService,
    editService,
    deleteService, } from '../controllers/admin-controller';

const router = express.Router();

router.get('/hotels', getHotels);
router.post('/hotel',createHotel)
router.put('/hotels/edit', editHotelByKey); 
router.delete('/hotels/delete', deleteHotelByKey);
router.patch('/hotels/block', toggleBlockHotelByKey);
router.get('/clients', getAllClients);
router.patch('/client/block-unblock',blockUnblockClient)
router.delete('/client/delete',deleteClient)
router.post('/services', createService);


router.put('/services/', editService);


router.delete('/services/', deleteService);

export default router;
