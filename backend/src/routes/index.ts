import { Router } from 'express';
import aviationRoutes from '../modules/aviation/routes';
import investandRoutes from '../modules/investand/routes';
import workschdRoutes from '../modules/workschd/routes';
import autodevRoutes from '../modules/autodev/routes';

const router = Router();

router.use('/aviation', aviationRoutes);
router.use('/investand', investandRoutes);
router.use('/workschd', workschdRoutes);
router.use('/autodev', autodevRoutes);

export default router;
